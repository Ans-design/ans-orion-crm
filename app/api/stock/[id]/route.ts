export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { logAuditChange } from '@/lib/audit';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { runApiHandler } from '@/lib/api-guard';
import { canViewMargin, stripStockUnitCost } from '@/lib/auth/margin-access';
import { resolveParams } from '@/lib/api/route-params';
import { parseStockPatchBody } from '@/lib/server/modules/stock/stock.validation';
import {
  adjustStockItem,
  getStockItemDetail,
  updateStockItemRecord,
} from '@/lib/server/modules/stock/stock.service';
import { propagateStockToCommercialNow } from '@/lib/services/commercial-live-propagation.service';
import { attachLiveDomains } from '@/lib/live/live-response';

export async function GET(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const auth = await requireAnyPermission('stock:read', 'production:read');
  if ('error' in auth) return auth.error;

  const { id } = await resolveParams(ctx.params);

  return runApiHandler('stock GET [id]', async () => {
    const item = await getStockItemDetail(id);
    if (!item) return apiError('Article introuvable', 404);
    const data = canViewMargin(auth.role) ? item : stripStockUnitCost(item, auth.role);
    return NextResponse.json({ ok: true, data });
  });
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const auth = await requireAnyPermission('stock:write', 'production:write');
  if ('error' in auth) return auth.error;

  const { id } = await resolveParams(ctx.params);

  return runApiHandler('stock PATCH [id]', async (): Promise<Response> => {
    try {
      const patch = parseStockPatchBody(await req.json());
      if (!patch.ok) return apiError(patch.error, 400);

      if (patch.kind === 'adjust') {
        const result = await adjustStockItem(id, patch.data, {
          userId: auth.userId,
          userName: auth.userName,
        });
        if (!result.ok) {
          if (result.code === 'NOT_FOUND') return apiError('Article introuvable', 404);
          if (result.code === 'INSUFFICIENT_STOCK' || result.code === 'RESERVED_QTY_EXCEEDS_STOCK') {
            return apiError(result.message ?? 'Mouvement stock refusé', 409);
          }
          return apiError('Erreur stock', 400);
        }

        await logAuditChange({
          userId: auth.userId,
          userName: auth.userName,
          action: 'UPDATE',
          entity: 'Stock',
          entityId: result.item.id,
          entityLabel: result.item.label,
          oldValue: result.audit.oldValue,
          newValue: result.audit.newValue,
          details: { movement: patch.data.type },
        });

        const { domains } = await propagateStockToCommercialNow({ rebuildIndex: false });
        return attachLiveDomains(NextResponse.json({ ok: true, data: result.item }), domains);
      }

      const result = await updateStockItemRecord(id, patch.data);
      if (!result.ok) {
        if (result.code === 'NOT_FOUND') return apiError('Article introuvable', 404);
        if (result.code === 'RESERVED_QTY_EXCEEDS_STOCK') {
          return apiError(result.message ?? 'Réservation incohérente', 409);
        }
        return apiError('Erreur stock', 400);
      }

      if (result.audit.hasChanges) {
        await logAuditChange({
          userId: auth.userId,
          userName: auth.userName,
          action: 'UPDATE',
          entity: 'Stock',
          entityId: result.item.id,
          entityLabel: result.item.label,
          oldValue: result.audit.oldValue,
          newValue: result.audit.newValue,
        });
      }

      const costChanged =
        patch.data.unitCost !== undefined
        || patch.data.salePrice !== undefined;
      const { domains } = await propagateStockToCommercialNow({ rebuildIndex: costChanged });
      return attachLiveDomains(NextResponse.json({ ok: true, data: result.item }), domains);
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur mise à jour stock'), 500);
    }
  });
}
