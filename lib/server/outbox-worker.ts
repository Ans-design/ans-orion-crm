/**
 * Worker outbox V12 — consomme pending/failed, marque succeeded/dead.
 * Handlers enregistrés par type d’événement.
 */

import {
  claimOutboxBatch,
  markOutboxFailed,
  markOutboxSucceeded,
  outboxBackoffMs,
} from '@/lib/server/outbox';

export type OutboxHandler = (event: {
  id: string;
  type: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  attempts: number;
}) => Promise<void>;

const handlers = new Map<string, OutboxHandler>();

export function registerOutboxHandler(type: string, handler: OutboxHandler): void {
  handlers.set(type, handler);
}

/** Handler par défaut : log + succès (évite dead-letter immédiat pour types inconnus en bootstrap). */
async function defaultHandler(event: { type: string; aggregateId: string }): Promise<void> {
  console.info('[outbox-worker] no handler — ack', event.type, event.aggregateId);
}

export async function processOutboxBatch(opts?: {
  workerId?: string;
  limit?: number;
  maxAttempts?: number;
}): Promise<{ claimed: number; succeeded: number; failed: number; dead: number }> {
  const workerId = opts?.workerId || `worker-${process.pid}`;
  const maxAttempts = opts?.maxAttempts ?? 8;
  const batch = await claimOutboxBatch({
    workerId,
    limit: opts?.limit ?? 10,
    maxAttempts,
  });

  let succeeded = 0;
  let failed = 0;
  let dead = 0;

  for (const row of batch) {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(row.payload) as Record<string, unknown>;
    } catch {
      payload = { raw: row.payload };
    }

    const handler = handlers.get(row.type) ?? defaultHandler;
    try {
      await handler({
        id: row.id,
        type: row.type,
        aggregateType: row.aggregateType,
        aggregateId: row.aggregateId,
        payload,
        attempts: row.attempts,
      });
      await markOutboxSucceeded(row.id);
      succeeded += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isDead = row.attempts >= maxAttempts;
      await markOutboxFailed(
        row.id,
        { message, code: 'HANDLER_ERROR' },
        {
          dead: isDead,
          retryAfterMs: outboxBackoffMs(row.attempts),
        },
      );      if (isDead) dead += 1;
      else failed += 1;
    }
  }

  return { claimed: batch.length, succeeded, failed, dead };
}
