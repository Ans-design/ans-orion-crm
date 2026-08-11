import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

function buildDetailsPayload(params: {
  details?: unknown;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}): Record<string, unknown> | undefined {
  const payload: Record<string, unknown> = {};

  if (params.details && typeof params.details === 'object' && !Array.isArray(params.details)) {
    Object.assign(payload, params.details as Record<string, unknown>);
  } else if (params.details != null) {
    payload.value = params.details;
  }

  if (params.oldValue) payload.oldValue = params.oldValue;
  if (params.newValue) payload.newValue = params.newValue;

  return Object.keys(payload).length > 0 ? payload : undefined;
}

export async function logAudit(params: {
  userId?: string;
  userName?: string;
  action: string;
  entity: string;
  entityId?: string;
  entityLabel?: string;
  details?: unknown;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}) {
  try {
    const detailsPayload = buildDetailsPayload(params);

    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        userName: params.userName || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        entityLabel: params.entityLabel || null,
        details: detailsPayload ? JSON.stringify(detailsPayload) : null,
        ...(params.oldValue ? { oldValue: params.oldValue as Prisma.InputJsonValue } : {}),
        ...(params.newValue ? { newValue: params.newValue as Prisma.InputJsonValue } : {}),
      },
    });
  } catch (e) {
    console.error('Audit log error:', e);
  }
}

/** Journalise avec ancienne / nouvelle valeur (Phase 4) */
export async function logAuditChange(params: {
  userId?: string;
  userName?: string;
  action: string;
  entity: string;
  entityId?: string;
  entityLabel?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  details?: Record<string, unknown>;
}) {
  return logAudit({
    ...params,
    details: params.details,
    oldValue: params.oldValue,
    newValue: params.newValue,
  });
}
