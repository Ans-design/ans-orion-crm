import { logAudit } from '@/lib/audit';

/** Journal audit actions POS (prix forcé, remise, paiement, caisse…) */
export async function logPosAudit(params: {
  userId?: string;
  userName?: string;
  action: string;
  entity: string;
  entityId?: string;
  entityLabel?: string;
  details?: Record<string, unknown>;
}) {
  await logAudit({
    ...params,
    entity: `POS:${params.entity}`,
    details: params.details,
  });
}
