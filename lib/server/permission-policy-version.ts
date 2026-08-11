/**
 * Permission policyVersion monotone (V12 Lot 7).
 * Changement de droits → bump version + outbox PermissionPolicyChanged.
 */

import { prisma } from '@/lib/prisma';
import { enqueueOutbox } from '@/lib/server/outbox';

export async function getPermissionPolicyVersion(): Promise<number> {
  const row = await prisma.permissionPolicyMeta.findUnique({ where: { id: 'singleton' } });
  return row?.version ?? 1;
}

export async function bumpPermissionPolicyVersion(opts?: {
  updatedBy?: string;
  note?: string;
}): Promise<number> {
  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.permissionPolicyMeta.findUnique({ where: { id: 'singleton' } });
    const next = (current?.version ?? 0) + 1;
    const row = await tx.permissionPolicyMeta.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        version: next,
        updatedBy: opts?.updatedBy ?? null,
        note: opts?.note ?? null,
      },
      update: {
        version: next,
        updatedBy: opts?.updatedBy ?? null,
        note: opts?.note ?? null,
      },
    });
    await enqueueOutbox({
      tx,
      type: 'PermissionPolicyChanged',
      aggregateType: 'PermissionPolicy',
      aggregateId: 'singleton',
      aggregateVersion: row.version,
      idempotencyKey: `permission-policy:${row.version}`,
      payload: { version: row.version, note: opts?.note ?? null },
    });
    return row.version;
  });
  return updated;
}
