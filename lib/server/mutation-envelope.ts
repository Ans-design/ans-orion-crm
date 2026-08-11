/**
 * Enveloppe mutation API standard V12.
 */

export type MutationSyncStatus =
  | 'COMMITTED'
  | 'QUEUED'
  | 'SYNCED'
  | 'PARTIAL'
  | 'FAILED';

export type MutationSuccessEnvelope<T = unknown> = {
  ok: true;
  mutationId: string;
  entity: { type: string; id: string; version?: number };
  sync: {
    runId?: string;
    status: MutationSyncStatus;
    pendingProjections: string[];
    warnings: string[];
  };
  data?: T;
};

export type MutationErrorEnvelope = {
  ok: false;
  error: {
    message: string;
    code: string;
    mutationId?: string;
  };
};

export function mutationOk<T>(input: {
  mutationId?: string;
  entityType: string;
  entityId: string;
  version?: number;
  syncStatus?: MutationSyncStatus;
  runId?: string;
  pendingProjections?: string[];
  warnings?: string[];
  data?: T;
}): MutationSuccessEnvelope<T> {
  return {
    ok: true,
    mutationId: input.mutationId ?? `mut_${Date.now().toString(36)}`,
    entity: {
      type: input.entityType,
      id: input.entityId,
      version: input.version,
    },
    sync: {
      runId: input.runId,
      status: input.syncStatus ?? 'COMMITTED',
      pendingProjections: input.pendingProjections ?? [],
      warnings: input.warnings ?? [],
    },
    data: input.data,
  };
}

export function mutationFail(input: {
  message: string;
  code: string;
  mutationId?: string;
}): MutationErrorEnvelope {
  return {
    ok: false,
    error: {
      message: input.message,
      code: input.code,
      mutationId: input.mutationId,
    },
  };
}
