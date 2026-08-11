export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { publishArticleDynamicPricing, unpublishArticleDynamicPricing } from '@/lib/pricing/publish-dynamic-pricing';
import { migrateArticleFromSalePrice2026 } from '@/lib/pricing/migrate-from-sale-price2026';
import { resolveMigrationPilotConfig } from '@/lib/pricing/migration-pilot-configs';
import { loadPublishedDynamicContext } from '@/lib/pricing/dynamic-pricing-context';
import { logAudit } from '@/lib/audit';
import {
  replaceArticleDiscountTiers,
  upsertFormulaFromBlocks,
  upsertFormulaExpression,
  updateArticlePricingProfile,
  updateMaterialPrice,
  updateProductOptionGroup,
  updateProductOptionValue,
  updateUrgencyRule,
} from '@/lib/pricing/update-article-pricing';
import type { PriceBlock } from '@/lib/pricing/price-builder-blocks';
import { runApiHandler } from '@/lib/api-guard';
import { runFullSyncDriftAnalysis, summarizeSyncDriftReport } from '@/lib/services/sync-drift-service';
import { parseBody } from '@/lib/validators/common';
import { apiError } from '@/lib/api-response';
import {
  dynamicPricingArticleActionSchema,
  dynamicPricingPatchSchema,
} from '@/lib/server/modules/pricing/dynamic-pricing-api.validation';

type RouteParams = { params: Promise<{ articleId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('tarifs:read');
  if ('error' in auth) return auth.error;

  const { articleId } = await params;
  return runApiHandler(`dynamic-pricing/${articleId} GET`, async () => {
    const profile = await prisma.articlePricingProfile.findUnique({
      where: { articleId },
      include: {
        discountTiers: { orderBy: { minQty: 'asc' } },
        materialPrices: { orderBy: { label: 'asc' } },
        urgencyRules: { orderBy: { sortOrder: 'asc' } },
        stockRules: { where: { active: true } },
        formulaVersions: { orderBy: { version: 'desc' }, take: 12 },
        optionGroups: {
          include: { values: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }
    const published = await loadPublishedDynamicContext(articleId);
    return NextResponse.json({ profile, isPublished: Boolean(published) });
  }, { fallback: { error: 'indisponible' } });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  const { articleId } = await params;
  const parsed = parseBody(dynamicPricingArticleActionSchema, await req.json().catch(() => ({})));
  if (!parsed.ok) return apiError(parsed.error, 400);
  const body = parsed.data;

  if (body.action === 'publish') {
    try {
      const result = await publishArticleDynamicPricing(articleId, auth.userId);
      await logAudit({
        userId: auth.userId,
        userName: auth.userName,
        action: 'UPDATE',
        entity: 'FormulaVersion',
        entityId: articleId,
        entityLabel: `Publication moteur — ${articleId}`,
        details: result,
      });
      const { propagatePricingToCommercialNow } = await import(
        '@/lib/services/commercial-live-propagation.service'
      );
      const { jsonWithLiveDomains } = await import('@/lib/live/live-response');
      const propagation = await propagatePricingToCommercialNow({ rebuildIndex: true });
      let driftSummary = null;
      try {
        driftSummary = summarizeSyncDriftReport(await runFullSyncDriftAnalysis());
      } catch {
        /* drift non bloquant */
      }
      return jsonWithLiveDomains(
        { success: true, ...result, driftSummary, commercialPropagated: true },
        propagation.domains,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur publication';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  if (body.action === 'unpublish') {
    const result = await unpublishArticleDynamicPricing(articleId);
    const { propagatePricingToCommercialNow } = await import(
      '@/lib/services/commercial-live-propagation.service'
    );
    const { jsonWithLiveDomains } = await import('@/lib/live/live-response');
    const propagation = await propagatePricingToCommercialNow({ rebuildIndex: true });
    return jsonWithLiveDomains(
      { success: true, ...result, commercialPropagated: true },
      propagation.domains,
    );
  }

  if (body.action === 'migrate-from-2026') {
    try {
      const referenceConfig = body.config || resolveMigrationPilotConfig(articleId);
      const dryRun = Boolean(body.dryRun);
      const result = await migrateArticleFromSalePrice2026(articleId, { referenceConfig, dryRun });
      if (!dryRun && !result.skipped) {
        await logAudit({
          userId: auth.userId,
          userName: auth.userName,
          action: 'UPDATE',
          entity: 'ArticlePricingProfile',
          entityId: articleId,
          entityLabel: `Migration PRIX 2026 — ${articleId}`,
          details: result,
        });
      }
      return NextResponse.json({ success: !result.skipped, ...result });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur migration';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  return NextResponse.json({ error: 'action inconnue' }, { status: 400 });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  const { articleId } = await params;
  const parsed = parseBody(dynamicPricingPatchSchema, await req.json().catch(() => ({})));
  if (!parsed.ok) return apiError(parsed.error, 400);
  const { normalizeDynamicPricingPatch } = await import(
    '@/lib/server/modules/pricing/dynamic-pricing-api.validation'
  );
  const body = normalizeDynamicPricingPatch(parsed.data);

  try {
    let result: unknown;

    switch (body.section) {
      case 'profile':
        result = await updateArticlePricingProfile(articleId, {
          prixBase: body.prixBase,
          prixM2: body.prixM2,
          prixCm2: body.prixCm2,
          qtyMin: body.qtyMin,
        });
        break;
      case 'tiers':
        result = await replaceArticleDiscountTiers(articleId, body.tiers ?? [], {
          variantKey: typeof body.variantKey === 'string' ? body.variantKey : undefined,
        });
        break;
      case 'optionGroup':
        result = await updateProductOptionGroup(body.groupId, articleId, body);
        break;
      case 'optionValue':
        result = await updateProductOptionValue(body.valueId, body.groupId, {
          priceModifier: body.priceModifier,
          forcePrice: body.forcePrice,
          active: body.active,
          label: body.label,
        });
        break;
      case 'urgency':
        result = await updateUrgencyRule(body.ruleId, articleId, {
          label: body.label,
          surchargePercent: body.surchargePercent,
          requiresValidation: body.requiresValidation,
          active: body.active,
        });
        break;
      case 'material':
        result = await updateMaterialPrice(body.materialId, articleId, {
          prixM2: body.prixM2,
          prixCm2: body.prixCm2,
          label: body.label,
          active: body.active,
        });
        break;
      case 'formula':
        result = await upsertFormulaFromBlocks(articleId, body.blocks as PriceBlock[], {
          label: body.label,
          simpleFormula: typeof body.simpleFormula === 'string' ? body.simpleFormula : undefined,
          source: typeof body.source === 'string' ? body.source : undefined,
        });
        break;
      case 'formulaExpression':
        result = await upsertFormulaExpression(articleId, body.expression, {
          label: body.label,
        });
        break;
    }

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'UPDATE',
      entity: 'ArticlePricingProfile',
      entityId: articleId,
      entityLabel: `Édition inline ${body.section} — ${articleId}`,
      details: { section: body.section },
    });

    // Propagation immédiate : commercial / POS relisent la DB (catalogue + calculateurs)
    const needsIndex =
      body.section === 'material'
      || body.section === 'profile'
      || body.section === 'formula'
      || body.section === 'formulaExpression'
      || body.section === 'tiers';
    const { propagatePricingToCommercialNow } = await import(
      '@/lib/services/commercial-live-propagation.service'
    );
    const { jsonWithLiveDomains } = await import('@/lib/live/live-response');
    const propagation = await propagatePricingToCommercialNow({
      rebuildIndex: needsIndex,
    });

    return jsonWithLiveDomains(
      { success: true, result, commercialPropagated: true },
      propagation.domains,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur mise à jour';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
