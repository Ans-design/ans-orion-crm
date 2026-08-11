/**
 * SyncRun durable — orchestration multi-étapes (V12).
 */

import { prisma } from '@/lib/prisma';

export type SyncRunStatus = 'pending' | 'running' | 'succeeded' | 'partial' | 'failed';

export async function createSyncRun(input: {
  type: string;
  scope?: string;
  requestedBy?: string;
  dryRun?: boolean;
  stepKeys: string[];
}): Promise<{ runId: string }> {
  const run = await prisma.syncRun.create({
    data: {
      type: input.type,
      scope: input.scope ?? null,
      requestedBy: input.requestedBy ?? null,
      dryRun: input.dryRun ?? false,
      status: 'running',
      total: input.stepKeys.length,
      startedAt: new Date(),
      steps: {
        create: input.stepKeys.map((stepKey) => ({ stepKey, status: 'pending' })),
      },
    },
  });
  return { runId: run.id };
}

export async function completeSyncStep(
  runId: string,
  stepKey: string,
  result: { ok: boolean; errorCode?: string; errorMsg?: string; skipped?: boolean },
): Promise<void> {
  const status = result.skipped ? 'skipped' : result.ok ? 'succeeded' : 'failed';
  await prisma.syncRunStep.update({
    where: { runId_stepKey: { runId, stepKey } },
    data: {
      status,
      errorCode: result.errorCode ?? null,
      errorMsg: result.errorMsg?.slice(0, 500) ?? null,
      completedAt: new Date(),
      startedAt: new Date(),
      attempts: { increment: 1 },
    },
  });
}

export async function finalizeSyncRun(runId: string): Promise<{
  status: SyncRunStatus;
  succeeded: number;
  failed: number;
  skipped: number;
}> {
  const steps = await prisma.syncRunStep.findMany({ where: { runId } });
  const succeeded = steps.filter((s) => s.status === 'succeeded').length;
  const failed = steps.filter((s) => s.status === 'failed').length;
  const skipped = steps.filter((s) => s.status === 'skipped').length;
  let status: SyncRunStatus = 'succeeded';
  if (failed > 0 && succeeded > 0) status = 'partial';
  else if (failed > 0) status = 'failed';
  else if (succeeded === 0 && skipped > 0) status = 'partial';

  const errorSummary =
    failed > 0
      ? steps
          .filter((s) => s.status === 'failed')
          .map((s) => `${s.stepKey}:${s.errorCode || s.errorMsg || 'error'}`)
          .join('; ')
          .slice(0, 500)
      : null;

  await prisma.syncRun.update({
    where: { id: runId },
    data: {
      status,
      succeeded,
      failed,
      skipped,
      errorSummary,
      completedAt: new Date(),
    },
  });

  return { status, succeeded, failed, skipped };
}
