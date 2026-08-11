export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, hasPermission } from '@/lib/auth-utils';
import { resolvePrice } from '@/lib/pricing/ans-price-store';
import { estimateMarginForLine } from '@/lib/pricing/estimate-margin';
import { sanitizePricingPayloadForRole } from '@/lib/pricing/sanitize-pricing-payload';
import { prisma } from '@/lib/prisma';
import { normalizePaperInConfig, validatePaperConfigStrict } from '@/lib/data/paper-material';
import { apiError } from '@/lib/api-response';
import { runApiHandler } from '@/lib/api-guard';
import { parseBody } from '@/lib/validators/common';
import { pricingSimulateSchema } from '@/lib/server/modules/pricing/pricing-api.validation';
import { loadPublishedDynamicContext } from '@/lib/pricing/dynamic-pricing-context';

export async function POST(req: NextRequest) {
  const auth = await requirePermission('tarifs:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('pricing/simulate POST', async () => {
    const parsed = parseBody(pricingSimulateSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);
    const { articleId, config, qty, prixForce, totalForce, priceReason, lite } = parsed.data;

    const { config: normalized } = normalizePaperInConfig(config);
    const paperCheck = validatePaperConfigStrict(normalized);
    if (!paperCheck.ok) return apiError(paperCheck.error!, 400);

    const mergedConfig = { ...normalized, qty: qty ?? normalized.qty ?? normalized.quantite ?? 1 };
    const result = await resolvePrice(articleId, mergedConfig, { prixForce, totalForce, priceReason });

    if (!result) {
      return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });
    }

    // Chemin POS rapide : pas de businessRules / formule / dynamicCtx / marge
    if (lite) {
      return NextResponse.json(
        sanitizePricingPayloadForRole(
          {
            ...result,
            engine: (result.snapshot as Record<string, unknown>)?.dynamicEngine ? 'dynamic' : 'legacy',
          } as Record<string, unknown>,
          auth.role,
        ),
      );
    }

    const [rules, formula, dynamicCtx] = await Promise.all([
      prisma.businessRule.findMany({
        where: { OR: [{ articleId }, { articleId: null }], active: true },
        orderBy: { priority: 'asc' },
        take: 20,
      }),
      prisma.priceFormula.findFirst({ where: { articleId, active: true } }),
      loadPublishedDynamicContext(articleId),
    ]);

    const payload: Record<string, unknown> = {
      ...result,
      formula,
      dynamicFormula: dynamicCtx?.formula ?? null,
      dynamicProfile: dynamicCtx?.profile ?? null,
      engine: (result.snapshot as Record<string, unknown>)?.dynamicEngine ? 'dynamic' : 'legacy',
      rulesApplied: rules.filter((r) => r.connected),
      rulesBlocked: rules.filter((r) => !r.connected),
    };

    if (hasPermission(auth.role, 'pos:view_margin')) {
      const margin = await estimateMarginForLine(articleId, mergedConfig, result.prixUnitaire);
      if (margin) payload.margin = margin;
    }

    return NextResponse.json(sanitizePricingPayloadForRole(payload, auth.role));
  }, { fallback: { ok: false, prixUnitaire: 0, total: 0 } });
}
