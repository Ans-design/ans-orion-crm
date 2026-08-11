export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { patchUnifiedMaterialPriceRow } from '@/lib/server/modules/pricing/base-material-price.service';
import { resolveParams } from '@/lib/api/route-params';
import { propagatePricingToCommercialNow } from '@/lib/services/commercial-live-propagation.service';
import { jsonWithLiveDomains } from '@/lib/live/live-response';

const patchSchema = z
  .object({
    basePrintingPriceId: z.string().nullable().optional(),
    label: z.string().min(1).optional(),
    family: z.string().optional(),
    materialKey: z.string().optional(),
    grammage: z.string().nullable().optional(),
    thickness: z.string().nullable().optional(),
    formatStandard: z.string().nullable().optional(),
    formatLabel: z.string().nullable().optional(),
    face: z.string().nullable().optional(),
    saleUnit: z.string().nullable().optional(),
    unit: z.string().nullable().optional(),
    unitDisplay: z.string().nullable().optional(),
    unitStandard: z.string().nullable().optional(),
    conversionFactor: z.number().finite().nullable().optional(),
    purchasePrice: z.number().finite().nullable().optional(),
    basePrintPrice: z.number().finite().nullable().optional(),
    blankSellPrice: z.number().finite().nullable().optional(),
    maxPrice: z.number().finite().nullable().optional(),
    targetMargin: z.number().finite().nullable().optional(),
    minMargin: z.number().finite().nullable().optional(),
    active: z.boolean().optional(),
    visiblePos: z.boolean().optional(),
    visiblePOS: z.boolean().optional(),
    impactsPrice: z.boolean().optional(),
    impactsStock: z.boolean().optional(),
    stockItemId: z.string().nullable().optional(),
    anomalyNotes: z.string().nullable().optional(),
    publicationStatus: z.enum(['draft', 'published', 'archived']).optional(),
    reason: z.string().max(500).optional(),
  })
  .strict();

export async function PATCH(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;
  const { id } = await resolveParams(ctx.params);

  try {
    const raw = await req.json();
    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Données invalides',
          errors: parsed.error.issues.map((i) => ({
            code: i.code,
            message: i.message,
            field: i.path.join('.') || undefined,
          })),
        },
        { status: 400 },
      );
    }
    const body = parsed.data;

    // Prix sous coût → warning (pas de blocage silencieux) ; refus si marge négative forcée
    const purchase = body.purchasePrice;
    const sell = body.basePrintPrice ?? body.blankSellPrice ?? body.maxPrice;
    if (
      purchase != null
      && sell != null
      && purchase > 0
      && sell > 0
      && sell < purchase
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Prix de vente inférieur au coût d’achat — correction ou motif Direction requis',
          errors: [{ code: 'PRICE_BELOW_COST', message: 'Prix < coût', field: 'basePrintPrice' }],
        },
        { status: 400 },
      );
    }

    const row = await patchUnifiedMaterialPriceRow({
      materialId: id,
      basePrintingPriceId: body.basePrintingPriceId ?? null,
      label: body.label,
      family: body.family,
      materialKey: body.materialKey,
      grammage: body.grammage,
      thickness: body.thickness,
      formatStandard: (body.formatStandard ?? body.formatLabel) as string | null | undefined,
      face: body.face,
      saleUnit: (body.saleUnit ?? body.unit) as string | null | undefined,
      unitDisplay: body.unitDisplay,
      unitStandard: body.unitStandard,
      conversionFactor: body.conversionFactor,
      purchasePrice: body.purchasePrice,
      basePrintPrice: body.basePrintPrice,
      blankSellPrice: body.blankSellPrice,
      maxPrice: body.maxPrice,
      targetMargin: body.targetMargin,
      minMargin: body.minMargin,
      active: body.active,
      visiblePos: (body.visiblePos ?? body.visiblePOS) as boolean | undefined,
      impactsPrice: body.impactsPrice,
      impactsStock: body.impactsStock,
      stockItemId: body.stockItemId,
      anomalyNotes: body.anomalyNotes,
      publicationStatus: body.publicationStatus,
      reason: body.reason,
    });
    const isDraft =
      (row as { publicationStatus?: string }).publicationStatus !== 'published';
    // Tarif publié → commercial immédiat ; brouillon → admin only (cache + catalogue admin)
    const propagation = await propagatePricingToCommercialNow({
      rebuildIndex: !isDraft,
    });
    return jsonWithLiveDomains(
      {
        ok: true,
        data: row,
        draft: isDraft,
        warnings: [] as Array<{ code: string; message: string; field?: string }>,
        commercialPropagated: !isDraft,
      },
      propagation.domains,
    );
  } catch (error) {
    const msg = safeErrorMessage(error, 'Mise à jour impossible');
    const status = /introuvable|not found/i.test(msg) ? 404 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
