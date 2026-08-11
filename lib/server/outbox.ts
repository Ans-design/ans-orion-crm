/**
 * Outbox durable V12 — effets externes / projections (FLOW-002 + SYNC).
 * Écrire dans la MÊME transaction Prisma que l’agrégat source quand possible.
 *
 * Statuts canoniques (PARTIE C) :
 *   PENDING | PROCESSING | DONE | FAILED | DEAD
 * Stockage DB (rétrocompat) : pending | processing | succeeded | failed | dead
 * (DONE ↔ succeeded)
 */

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const OUTBOX_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  DONE: 'succeeded',
  FAILED: 'failed',
  DEAD: 'dead',
} as const;

export type OutboxStatusDb =
  | typeof OUTBOX_STATUS.PENDING
  | typeof OUTBOX_STATUS.PROCESSING
  | typeof OUTBOX_STATUS.DONE
  | typeof OUTBOX_STATUS.FAILED
  | typeof OUTBOX_STATUS.DEAD;

export type OutboxStatus = OutboxStatusDb;

export type OutboxPayload = Record<string, unknown>;

type Db = Prisma.TransactionClient | typeof prisma;

/** Lease par défaut — reprise après crash worker. */
export const OUTBOX_LEASE_MS = 60_000;

export type OutboxEnqueueInput = {
  type: string;
  aggregateType: string;
  aggregateId: string;
  payload: OutboxPayload;
  correlationId?: string;
  causationId?: string;
  idempotencyKey?: string;
  aggregateVersion?: number;
  availableAt?: Date;
  /** Client Prisma (TX) — obligatoire pour atomicité métier + outbox. */
  tx?: Db;
};

export async function enqueueOutbox(
  input: OutboxEnqueueInput,
): Promise<{ id: string; deferred: boolean; duplicate?: boolean }> {
  const db: Db = input.tx ?? prisma;
  const row = {
    type: input.type,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    aggregateVersion: input.aggregateVersion ?? 0,
    payload: JSON.stringify(input.payload),
    correlationId: input.correlationId ?? null,
    causationId: input.causationId ?? null,
    idempotencyKey: input.idempotencyKey ?? null,
    status: OUTBOX_STATUS.PENDING,
    availableAt: input.availableAt ?? new Date(),
  };

  try {
    if (row.idempotencyKey) {
      const existing = await db.outboxEvent.findUnique({
        where: { idempotencyKey: row.idempotencyKey },
        select: { id: true },
      });
      if (existing) return { id: existing.id, deferred: false, duplicate: true };
    }
    const created = await db.outboxEvent.create({ data: row });
    return { id: created.id, deferred: false };
  } catch (err) {
    const prismaCode =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code: unknown }).code)
        : '';
    if ((prismaCode === 'P2002' || /Unique constraint/i.test(String(err))) && row.idempotencyKey) {
      const existing = await db.outboxEvent.findUnique({
        where: { idempotencyKey: row.idempotencyKey },
        select: { id: true },
      });
      if (existing) return { id: existing.id, deferred: false, duplicate: true };
    }
    if (input.tx) throw err;
    console.error('[outbox] enqueue failed', input.type, err);
    console.warn('[outbox] événement différé', input.type, input.aggregateId);
    return { id: `deferred-${Date.now()}`, deferred: true };
  }
}

function isPostgresUrl(url = process.env.DATABASE_URL || ''): boolean {
  return url.startsWith('postgres://') || url.startsWith('postgresql://');
}

/**
 * Claim atomique d’un lot.
 * - Postgres : UPDATE … FROM (SELECT … FOR UPDATE SKIP LOCKED)
 * - SQLite : optimistic updateMany (tests locaux — ne prouve pas à lui seul le comportement PG)
 */
export async function claimOutboxBatch(opts: {
  workerId: string;
  limit?: number;
  maxAttempts?: number;
  leaseMs?: number;
  /** Filtre optionnel (tests / workers spécialisés). */
  types?: string[];
}): Promise<
  Array<{
    id: string;
    type: string;
    aggregateType: string;
    aggregateId: string;
    payload: string;
    attempts: number;
  }>
> {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 10));
  const maxAttempts = opts.maxAttempts ?? 8;
  const leaseMs = opts.leaseMs ?? OUTBOX_LEASE_MS;
  const now = new Date();
  const leaseExpiredBefore = new Date(Date.now() - leaseMs);

  if (isPostgresUrl()) {
    return claimOutboxBatchPostgres({
      workerId: opts.workerId,
      limit,
      maxAttempts,
      now,
      leaseExpiredBefore,
      types: opts.types,
    });
  }

  return claimOutboxBatchSqlite({
    workerId: opts.workerId,
    limit,
    maxAttempts,
    now,
    leaseExpiredBefore,
    types: opts.types,
  });
}

async function claimOutboxBatchSqlite(opts: {
  workerId: string;
  limit: number;
  maxAttempts: number;
  now: Date;
  leaseExpiredBefore: Date;
  types?: string[];
}) {
  const candidates = await prisma.outboxEvent.findMany({
    where: {
      attempts: { lt: opts.maxAttempts },
      availableAt: { lte: opts.now },
      ...(opts.types?.length ? { type: { in: opts.types } } : {}),
      OR: [
        {
          status: { in: [OUTBOX_STATUS.PENDING, OUTBOX_STATUS.FAILED] },
          OR: [{ lockedAt: null }, { lockedAt: { lt: opts.leaseExpiredBefore } }],
        },
        {
          status: OUTBOX_STATUS.PROCESSING,
          lockedAt: { lt: opts.leaseExpiredBefore },
        },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: opts.limit * 3,
  });

  const claimed = [];
  for (const row of candidates) {
    if (claimed.length >= opts.limit) break;
    const updated = await prisma.outboxEvent.updateMany({
      where: {
        id: row.id,
        OR: [
          { status: { in: [OUTBOX_STATUS.PENDING, OUTBOX_STATUS.FAILED] } },
          {
            status: OUTBOX_STATUS.PROCESSING,
            lockedAt: { lt: opts.leaseExpiredBefore },
          },
        ],
      },
      data: {
        status: OUTBOX_STATUS.PROCESSING,
        lockedAt: opts.now,
        lockedBy: opts.workerId,
        attempts: { increment: 1 },
      },
    });
    if (updated.count === 1) {
      claimed.push({
        id: row.id,
        type: row.type,
        aggregateType: row.aggregateType,
        aggregateId: row.aggregateId,
        payload: row.payload,
        attempts: row.attempts + 1,
      });
    }
  }
  return claimed;
}

/**
 * Stratégie Postgres — SKIP LOCKED pour concurrence réelle multi-worker.
 * Si le raw SQL échoue (schéma), repli SQLite-like.
 */
async function claimOutboxBatchPostgres(opts: {
  workerId: string;
  limit: number;
  maxAttempts: number;
  now: Date;
  leaseExpiredBefore: Date;
  types?: string[];
}) {
  // Filtre types : repli chemin SQLite (raw typé plus simple à maintenir)
  if (opts.types?.length) {
    return claimOutboxBatchSqlite(opts);
  }
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        type: string;
        aggregateType: string;
        aggregateId: string;
        payload: string;
        attempts: number;
      }>
    >`
      WITH cte AS (
        SELECT id
        FROM "OutboxEvent"
        WHERE "attempts" < ${opts.maxAttempts}
          AND "availableAt" <= ${opts.now}
          AND (
            ("status" IN ('pending', 'failed') AND ("lockedAt" IS NULL OR "lockedAt" < ${opts.leaseExpiredBefore}))
            OR ("status" = 'processing' AND "lockedAt" < ${opts.leaseExpiredBefore})
          )
        ORDER BY "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${opts.limit}
      )
      UPDATE "OutboxEvent" AS o
      SET
        "status" = 'processing',
        "lockedAt" = ${opts.now},
        "lockedBy" = ${opts.workerId},
        "attempts" = o."attempts" + 1,
        "updatedAt" = ${opts.now}
      FROM cte
      WHERE o.id = cte.id
      RETURNING o.id, o.type, o."aggregateType", o."aggregateId", o.payload, o.attempts
    `;
    return rows;
  } catch (err) {
    console.warn('[outbox] Postgres SKIP LOCKED indisponible — repli updateMany', err);
    return claimOutboxBatchSqlite(opts);
  }
}

export async function markOutboxSucceeded(id: string): Promise<void> {
  await prisma.outboxEvent.update({
    where: { id },
    data: {
      status: OUTBOX_STATUS.DONE,
      processedAt: new Date(),
      lockedAt: null,
      lockedBy: null,
      lastError: null,
      lastErrorCode: null,
    },
  });
}

export async function markOutboxFailed(
  id: string,
  err: { code?: string; message: string },
  opts?: { dead?: boolean; retryAfterMs?: number },
): Promise<void> {
  const dead = opts?.dead === true;
  const cleanMessage = String(err.message ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .slice(0, 500);
  await prisma.outboxEvent.update({
    where: { id },
    data: {
      status: dead ? OUTBOX_STATUS.DEAD : OUTBOX_STATUS.FAILED,
      lastError: cleanMessage,
      lastErrorCode: err.code ?? null,
      lockedAt: null,
      lockedBy: null,
      availableAt: new Date(Date.now() + (opts?.retryAfterMs ?? 5_000)),
      processedAt: dead ? new Date() : null,
    },
  });
}

/** Rejeu contrôlé d’une dead letter → PENDING. */
export async function replayOutboxDead(
  id: string,
  opts?: { resetAttempts?: boolean },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const row = await prisma.outboxEvent.findUnique({ where: { id } });
  if (!row) return { ok: false, reason: 'NOT_FOUND' };
  if (row.status !== OUTBOX_STATUS.DEAD && row.status !== OUTBOX_STATUS.FAILED) {
    return { ok: false, reason: 'NOT_REPLAYABLE' };
  }
  await prisma.outboxEvent.update({
    where: { id },
    data: {
      status: OUTBOX_STATUS.PENDING,
      availableAt: new Date(),
      lockedAt: null,
      lockedBy: null,
      lastError: null,
      lastErrorCode: null,
      processedAt: null,
      ...(opts?.resetAttempts ? { attempts: 0 } : {}),
    },
  });
  return { ok: true };
}

export function paymentIdempotencyKey(parts: {
  provider?: string;
  reference?: string | null;
  factureId?: string | null;
  commandeId?: string | null;
  montant: number;
}): string {
  const ref = String(parts.reference ?? '').trim().toLowerCase();
  const scope = parts.factureId || parts.commandeId || 'orphan';
  const provider = parts.provider || 'manual';
  return `${provider}:${scope}:${ref}:${Math.round(parts.montant)}`;
}

export function outboxBackoffMs(attempts: number): number {
  return Math.min(60_000, 2_000 * 2 ** Math.min(6, Math.max(0, attempts)));
}
