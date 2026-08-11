export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission, requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  archiveBaseMaterial,
  getBaseMaterialById,
  patchBaseMaterial,
  purgeArchivedBaseMaterial,
} from '@/lib/server/modules/pricing/base-material.repository';
import { invalidateKpiCaches } from '@/lib/services/kpi-cache-invalidation';

const ALLOWED = new Set([
  'label', 'family', 'grammage', 'thickness', 'formatStandard', 'widthMm', 'heightMm',
  'dimensionUnit', 'saleUnit', 'unitDisplay', 'unitStandard', 'conversionFactor',
  'basePrintType', 'purchasePrice', 'basePrintPrice', 'blankSellPrice', 'maxPrice', 'targetMargin', 'minMargin',
  'active', 'visiblePos', 'impactsPrice', 'impactsStock', 'stockItemId', 'stockThreshold',
  'stockLocation', 'anomalyNotes', 'publicationStatus', 'displayName', 'normalizedName', 'aliases',
]);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (ALLOWED.has(k)) data[k] = v;
    }
    if (!Object.keys(data).length) {
      return NextResponse.json({ ok: false, error: 'Aucun champ modifiable' }, { status: 400 });
    }
    const row = await patchBaseMaterial(params.id, data);
    // Publié → propager vers Catalogue POS ; masqué/archivé → retirer
    try {
      if (row.publicationStatus === 'published' && !row.archived && row.visiblePos !== false) {
        const { propagatePublishedMaterialPrice } = await import(
          '@/lib/services/admin-data-sync.service'
        );
        await propagatePublishedMaterialPrice(params.id, {
          userId: auth.userId,
          userName: auth.userName,
        });
      } else if (row.archived || row.visiblePos === false || row.active === false) {
        const { withdrawMaterialFromPos } = await import('@/lib/services/admin-data-sync.service');
        await withdrawMaterialFromPos(params.id, {
          userId: auth.userId,
          userName: auth.userName,
        });
      }
    } catch {
      /* best-effort POS */
    }
    return NextResponse.json({
      ok: true,
      data: row,
      draft: row.publicationStatus !== 'published',
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, 'Mise à jour impossible') },
      { status: 500 },
    );
  }
}

/**
 * DELETE :
 * - matière active → soft-delete (corbeille)
 * - matière déjà archivée, ou `?permanent=1` → suppression définitive
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAnyPermission('tarifs:write', 'config:edit_price', 'config:publish');
  if ('error' in auth) return auth.error;

  try {
    const permanent = req.nextUrl.searchParams.get('permanent') === '1';
    const existing = await getBaseMaterialById(params.id);
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { message: 'Matière introuvable', code: 'NOT_FOUND' } },
        { status: 404 },
      );
    }

    if (permanent || existing.archived) {
      if (!existing.archived) {
        await archiveBaseMaterial(params.id, auth.userId);
      }
      await purgeArchivedBaseMaterial(params.id);
      await invalidateKpiCaches();
      return NextResponse.json({
        ok: true,
        data: { purged: true, id: params.id },
        message: 'Matière supprimée définitivement',
      });
    }

    const row = await archiveBaseMaterial(params.id, auth.userId);
    try {
      const { withdrawMaterialFromPos } = await import('@/lib/services/admin-data-sync.service');
      await withdrawMaterialFromPos(params.id, {
        userId: auth.userId,
        userName: auth.userName,
      });
    } catch {
      /* best-effort POS */
    }
    await invalidateKpiCaches();
    return NextResponse.json({
      ok: true,
      data: { archived: true, material: row },
      message: 'Matière déplacée dans la corbeille',
    });
  } catch (error) {
    const msg = safeErrorMessage(error, 'Suppression impossible');
    const status = /corbeille|archiv/i.test(msg) ? 400 : 500;
    return NextResponse.json(
      { ok: false, error: { message: msg, code: 'MATERIAL_DELETE_ERROR' } },
      { status },
    );
  }
}
