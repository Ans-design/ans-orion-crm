export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  getBaseMaterialsPayload,
  syncBaseMaterialsFromCatalog,
} from '@/lib/server/modules/pricing/base-material.service';
import { createMaterial } from '@/lib/server/modules/materials/materials.service';
import { EMPTY_MATERIALS_STATS } from '@/lib/server/modules/pricing/base-material.dto';
import { stripPurchasePriceFieldsDeep } from '@/lib/auth/margin-access';

export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;

  try {
    const sp = req.nextUrl.searchParams;
    const forceSync = sp.get('sync') === '1';

    if (forceSync) {
      // Sync = écriture — exige tarifs:write (pas config:view seul)
      const writeAuth = await requireAnyPermission('tarifs:write');
      if ('error' in writeAuth) return writeAuth.error;
      try {
        await syncBaseMaterialsFromCatalog();
      } catch (syncErr) {
        console.warn('[base-materials GET] sync:', syncErr);
      }
    }

    const payload = await getBaseMaterialsPayload({
      search: sp.get('search') ?? undefined,
      family: sp.get('family') ?? undefined,
      activeOnly: sp.get('activeOnly') === '1',
      publishedOnly: sp.get('publishedOnly') === '1',
      autoSync: forceSync,
      allowCatalogFallback: sp.get('allowCatalogFallback') === '1',
    });

    const role = auth.role ?? 'user';
    const materials = stripPurchasePriceFieldsDeep(payload.materials, role);

    return NextResponse.json({
      ok: true,
      data: {
        materials,
        stats: payload.stats,
        tableReady: payload.tableReady,
        /** @deprecated utiliser materials */
        rows: materials,
      },
    });
  } catch (error) {
    console.error('[admin-backoffice/pricing/base-materials GET]', error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: safeErrorMessage(error, 'Impossible de charger les matières'),
          code: 'MATERIALS_LOAD_ERROR',
        },
        data: { materials: [], stats: EMPTY_MATERIALS_STATS },
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAnyPermission('tarifs:write');
  if ('error' in auth) return auth.error;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = String(body.action ?? 'create');

    if (action === 'analyze-catalog' || action === 'apply-catalog') {
      const dryRun = action === 'analyze-catalog';
      const result = await syncBaseMaterialsFromCatalog({ dryRun });
      return NextResponse.json({
        ok: true,
        data: {
          ...result,
          message: dryRun
            ? `Aperçu : ${result.created} à créer · ${result.updated} libellés à normaliser · ${result.skipped} déjà présents`
            : `Appliqué : ${result.created} créées · ${result.updated} mises à jour · ${result.skipped} inchangées`,
        },
      });
    }

    const row = await createMaterial({
      materialKey: String(body.materialKey ?? ''),
      label: String(body.label ?? ''),
      family: body.family ? String(body.family) : undefined,
      grammage: body.grammage != null ? String(body.grammage) : null,
      thickness: body.thickness != null ? String(body.thickness) : null,
      formatStandard: body.formatStandard != null ? String(body.formatStandard) : null,
      unitDisplay: body.unitDisplay != null ? String(body.unitDisplay) : null,
      saleUnit: body.saleUnit != null ? String(body.saleUnit) : body.unitDisplay != null ? String(body.unitDisplay) : undefined,
      unitStandard: body.unitStandard != null ? String(body.unitStandard) : null,
      conversionFactor: body.conversionFactor != null && body.conversionFactor !== '' ? Number(body.conversionFactor) : null,
      purchasePrice: body.purchasePrice != null && body.purchasePrice !== '' ? Number(body.purchasePrice) : null,
      basePrintPrice: body.basePrintPrice != null && body.basePrintPrice !== '' ? Number(body.basePrintPrice) : null,
      maxPrice: body.maxPrice != null && body.maxPrice !== '' ? Number(body.maxPrice) : null,
      targetMargin: body.targetMargin != null && body.targetMargin !== '' ? Number(body.targetMargin) : null,
      minMargin: body.minMargin != null && body.minMargin !== '' ? Number(body.minMargin) : null,
      stockItemId: body.stockItemId != null ? String(body.stockItemId) : null,
      visiblePos: body.visiblePos != null ? Boolean(body.visiblePos) : undefined,
      active: body.active != null ? Boolean(body.active) : undefined,
      impactsPrice: body.impactsPrice != null ? Boolean(body.impactsPrice) : undefined,
      impactsStock: body.impactsStock != null ? Boolean(body.impactsStock) : undefined,
      publicationStatus: body.publicationStatus != null ? String(body.publicationStatus) : undefined,
    });
    return NextResponse.json({ ok: true, data: row });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Création impossible'), code: 'MATERIAL_CREATE_ERROR' } },
      { status: 500 },
    );
  }
}
