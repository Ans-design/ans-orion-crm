/**
 * Diagnostics outbox honnêtes — jamais « vert » si non mesuré.
 *
 * HEALTHY | DEGRADED | FAILED | UNKNOWN | NOT_CHECKED
 */

import { prisma } from '@/lib/prisma';
import { OUTBOX_STATUS } from '@/lib/server/outbox';

export type OutboxHealthLevel = 'HEALTHY' | 'DEGRADED' | 'FAILED' | 'UNKNOWN' | 'NOT_CHECKED';

export type OutboxDiagnosticsReport = {
  level: OutboxHealthLevel;
  checked: boolean;
  checkedAt: string | null;
  pending: number | null;
  processing: number | null;
  failed: number | null;
  dead: number | null;
  retriesAvailable: number | null;
  oldestPendingAt: string | null;
  oldestPendingAgeMs: number | null;
  lastSuccessAt: string | null;
  avgProcessingMs: number | null;
  activeWorkers: string[] | null;
  workerStatus: 'active' | 'unknown' | 'none';
  notes: string[];
};

function levelFromCounts(p: {
  pending: number;
  failed: number;
  dead: number;
  processing: number;
}): OutboxHealthLevel {
  if (p.dead > 0 || p.failed > 20) return 'FAILED';
  if (p.failed > 0 || p.pending > 50 || p.processing > 20) return 'DEGRADED';
  return 'HEALTHY';
}

export async function getOutboxDiagnostics(): Promise<OutboxDiagnosticsReport> {
  const checkedAt = new Date().toISOString();
  const notes: string[] = [];

  try {
    const [
      pending,
      processing,
      failed,
      dead,
      oldestPending,
      lastSuccess,
      recentDone,
      lockedWorkers,
    ] = await Promise.all([
      prisma.outboxEvent.count({ where: { status: OUTBOX_STATUS.PENDING } }),
      prisma.outboxEvent.count({ where: { status: OUTBOX_STATUS.PROCESSING } }),
      prisma.outboxEvent.count({ where: { status: OUTBOX_STATUS.FAILED } }),
      prisma.outboxEvent.count({ where: { status: OUTBOX_STATUS.DEAD } }),
      prisma.outboxEvent.findFirst({
        where: { status: { in: [OUTBOX_STATUS.PENDING, OUTBOX_STATUS.FAILED] } },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true, availableAt: true },
      }),
      prisma.outboxEvent.findFirst({
        where: { status: OUTBOX_STATUS.DONE, processedAt: { not: null } },
        orderBy: { processedAt: 'desc' },
        select: { processedAt: true },
      }),
      prisma.outboxEvent.findMany({
        where: {
          status: OUTBOX_STATUS.DONE,
          processedAt: { not: null },
          createdAt: { gte: new Date(Date.now() - 24 * 3600_000) },
        },
        select: { createdAt: true, processedAt: true },
        take: 200,
        orderBy: { processedAt: 'desc' },
      }),
      prisma.outboxEvent.findMany({
        where: {
          status: OUTBOX_STATUS.PROCESSING,
          lockedBy: { not: null },
          lockedAt: { gte: new Date(Date.now() - 5 * 60_000) },
        },
        select: { lockedBy: true },
        distinct: ['lockedBy'],
        take: 20,
      }),
    ]);

    const retriesAvailable = failed; // failed = retryables
    const oldestAt = oldestPending?.createdAt ?? null;
    const oldestPendingAgeMs = oldestAt ? Date.now() - oldestAt.getTime() : null;

    let avgProcessingMs: number | null = null;
    if (recentDone.length > 0) {
      const samples = recentDone
        .filter((r) => r.processedAt)
        .map((r) => r.processedAt!.getTime() - r.createdAt.getTime())
        .filter((ms) => ms >= 0 && ms < 3_600_000);
      if (samples.length) {
        avgProcessingMs = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
      } else {
        avgProcessingMs = null;
        notes.push('Durée moyenne non calculable (échantillon vide)');
      }
    } else {
      notes.push('Aucun succès récent (24h) — durée moyenne NOT_CHECKED');
    }

    const activeWorkers = lockedWorkers
      .map((w) => w.lockedBy)
      .filter((x): x is string => Boolean(x));

    let workerStatus: OutboxDiagnosticsReport['workerStatus'] = 'unknown';
    if (activeWorkers.length > 0) workerStatus = 'active';
    else if (pending === 0 && processing === 0) workerStatus = 'none';
    else {
      workerStatus = 'unknown';
      notes.push('Événements en file sans worker verrouillé récent — worker inconnu');
    }

    const level = levelFromCounts({ pending, failed, dead, processing });

    return {
      level,
      checked: true,
      checkedAt,
      pending,
      processing,
      failed,
      dead,
      retriesAvailable,
      oldestPendingAt: oldestAt?.toISOString() ?? null,
      oldestPendingAgeMs,
      lastSuccessAt: lastSuccess?.processedAt?.toISOString() ?? null,
      avgProcessingMs,
      activeWorkers: activeWorkers.length ? activeWorkers : null,
      workerStatus,
      notes,
    };
  } catch (err) {
    return {
      level: 'UNKNOWN',
      checked: false,
      checkedAt,
      pending: null,
      processing: null,
      failed: null,
      dead: null,
      retriesAvailable: null,
      oldestPendingAt: null,
      oldestPendingAgeMs: null,
      lastSuccessAt: null,
      avgProcessingMs: null,
      activeWorkers: null,
      workerStatus: 'unknown',
      notes: [
        'Mesure outbox échouée — ne pas afficher HEALTHY',
        err instanceof Error ? err.message.slice(0, 200) : 'error',
      ],
    };
  }
}

/** Jamais HEALTHY si non checked. */
export function displayOutboxLevel(report: OutboxDiagnosticsReport): OutboxHealthLevel {
  if (!report.checked) return 'NOT_CHECKED';
  return report.level;
}
