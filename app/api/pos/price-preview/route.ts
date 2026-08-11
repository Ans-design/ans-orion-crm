export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { runApiHandler } from '@/lib/api-guard';
import { parseBody } from '@/lib/validators/common';
import { posPricePreviewSchema } from '@/lib/server/modules/pricing/pricing-api.validation';
import { sanitizePricingPayloadForRole } from '@/lib/pricing/sanitize-pricing-payload';
import { resolveCanonicalTariff } from '@/lib/pricing/canonical-tariff-service';

export async function POST(req: NextRequest) {
  const auth = await requirePermission('pos:use');
  if ('error' in auth) return auth.error;

  return runApiHandler('pos/price-preview POST', async (): Promise<Response> => {
    const parsed = parseBody(posPricePreviewSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);
    const { articleId, config, prixForce, totalForce, priceReason } = parsed.data;

    const tariff = await resolveCanonicalTariff({
      articleId,
      config,
      qty: Number(config?.qty ?? config?.quantite ?? 1) || 1,
      options: { prixForce, totalForce, priceReason },
      skipCache: false,
    });

    if (!tariff.ok || !tariff.legacy) {
      return NextResponse.json(
        sanitizePricingPayloadForRole(
          {
            ok: false,
            articleId,
            error: tariff.error?.message ?? 'Tarif non configuré',
            code: tariff.error?.code ?? 'PRICE_NOT_CONFIGURED',
            provenance: tariff.provenance,
            releaseId: tariff.releaseId,
            engine: 'canonical-tariff',
          } as Record<string, unknown>,
          auth.role,
        ),
        { status: 422 },
      );
    }

    const sanitized = sanitizePricingPayloadForRole(
      {
        ok: true,
        articleId,
        result: tariff.legacy,
        tariff: {
          unitPriceAr: tariff.unitPriceAr,
          totalHtAr: tariff.totalHtAr,
          totalTtcAr: tariff.totalTtcAr,
          priceSource: tariff.priceSource,
          provenance: tariff.provenance,
          releaseId: tariff.releaseId,
          tariffVersion: tariff.tariffVersion,
          components: tariff.components,
        },
        engine: 'canonical-tariff',
      } as Record<string, unknown>,
      auth.role,
    );

    return NextResponse.json(sanitized);
  }, {
    fallbackResponse: { ok: false, error: 'Calcul prix indisponible' },
  });
}
