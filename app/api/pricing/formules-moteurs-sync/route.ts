export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { prisma } from '@/lib/prisma';
import {
  listPaperFormatRules,
  listSupportFaceRules,
  ensurePricingRulesSeeded,
} from '@/lib/services/pricing-rules-sync.service';
import { listGlobalPricingVariables } from '@/lib/server/modules/pricing/pricing-variables.service';
import {
  buildLiveParamOverrides,
  countLiveParamHits,
  type FmLiveSyncPayload,
  type FmLiveVolumeTier,
} from '@/lib/pricing/formules-moteurs-live-sync';
import { FM_PARAMETERS } from '@/lib/pricing/formules-moteurs-catalog';
import { isPrismaReglesReady } from '@/lib/regles-catalog';
import {
  DEFAULT_GENERIC_VOLUME_DISCOUNT_TIERS,
  DEFAULT_ISF_VOLUME_DISCOUNT_TIERS,
  VOLUME_TIERS_GENERIC_ARTICLE_ID,
  VOLUME_TIERS_ISF_ARTICLE_ID,
} from '@/lib/pricing/published-volume-tiers';

async function loadVolumeTiers(articleId: string): Promise<FmLiveVolumeTier[]> {
  try {
    const rows = await prisma.discountTier.findMany({
      where: { articleId, active: true },
      orderBy: { minQty: 'asc' },
      select: { minQty: true, maxQty: true, discountPercent: true },
      take: 12,
    });
    if (rows.length) {
      return rows.map((r) => ({
        minQty: r.minQty,
        maxQty: r.maxQty,
        discountPercent: Number(r.discountPercent) || 0,
      }));
    }
  } catch {
    /* fallback below */
  }
  return [];
}

/**
 * Agrège formats, variables, faces, BusinessRule et paliers volume
 * pour le cockpit Formules & moteurs (lecture sync — vérité DB).
 */
export async function GET() {
  const auth = await requirePermission('tarifs:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('pricing/formules-moteurs-sync GET', async () => {
    const errors: string[] = [];
    let paperFormats: FmLiveSyncPayload['paperFormats'] = [];
    let pricingVariables: FmLiveSyncPayload['pricingVariables'] = [];
    let supportFaces: FmLiveSyncPayload['supportFaces'] = [];
    let businessRules: FmLiveSyncPayload['businessRules'] = [];
    let tiersPos: FmLiveVolumeTier[] = [];
    let tiersUniversal: FmLiveVolumeTier[] = [];

    try {
      await ensurePricingRulesSeeded();
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'Seed règles pricing');
    }

    try {
      const rows = await listPaperFormatRules();
      paperFormats = rows.map((r) => ({
        id: r.id,
        formatCode: r.formatCode,
        ratioA4: Number(r.ratioA4) || 0,
        widthMm: r.widthMm,
        heightMm: r.heightMm,
        active: r.active,
      }));
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'PaperFormatRule indisponible');
    }

    try {
      const vars = await listGlobalPricingVariables();
      pricingVariables = vars.map((v) => ({
        code: v.code,
        value: v.value,
        label: v.label,
        active: v.active,
      }));
      // Coeffs face / finition (scope peut différer)
      const coeffs = await prisma.pricingVariable.findMany({
        where: {
          active: true,
          code: { in: ['face_recto_verso_mult', 'finition_surcharge_pct'] },
        },
        select: { code: true, value: true, label: true, active: true },
      });
      for (const c of coeffs) {
        if (!pricingVariables.some((v) => v.code === c.code)) {
          pricingVariables.push({
            code: c.code,
            value: c.value,
            label: c.label,
            active: c.active,
          });
        }
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'PricingVariable indisponible');
    }

    try {
      const faces = await listSupportFaceRules();
      supportFaces = faces.map((f) => ({
        supportKey: f.supportKey,
        supportName: f.supportLabel,
        rectoAllowed: f.rectoAllowed,
        versoAllowed: f.versoAllowed,
        rectoVersoAllowed: f.rectoVersoAllowed,
        active: f.active,
      }));
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'SupportFaceRule indisponible');
    }

    try {
      if (isPrismaReglesReady(prisma)) {
        const rows = await prisma.businessRule.findMany({
          where: { active: true },
          orderBy: [{ priority: 'asc' }, { ruleName: 'asc' }],
          take: 2000,
          select: {
            ruleKey: true,
            ruleName: true,
            ruleType: true,
            family: true,
            message: true,
            active: true,
            connected: true,
          },
        });
        businessRules = rows.map((r) => ({
          ruleKey: r.ruleKey,
          ruleName: r.ruleName,
          ruleType: r.ruleType,
          family: r.family,
          message: r.message,
          active: r.active,
          connected: r.connected,
        }));
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'BusinessRule indisponible');
    }

    try {
      tiersPos = await loadVolumeTiers(VOLUME_TIERS_GENERIC_ARTICLE_ID);
      if (!tiersPos.length) {
        tiersPos = DEFAULT_GENERIC_VOLUME_DISCOUNT_TIERS.map((t) => ({
          minQty: t.minQty,
          maxQty: t.maxQty,
          discountPercent: t.discountPercent,
        }));
      }
      tiersUniversal = await loadVolumeTiers(VOLUME_TIERS_ISF_ARTICLE_ID);
      if (!tiersUniversal.length) {
        tiersUniversal = DEFAULT_ISF_VOLUME_DISCOUNT_TIERS.map((t) => ({
          minQty: t.minQty,
          maxQty: t.maxQty,
          discountPercent: t.discountPercent,
        }));
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'DiscountTier indisponible');
      tiersPos = DEFAULT_GENERIC_VOLUME_DISCOUNT_TIERS.map((t) => ({
        minQty: t.minQty,
        maxQty: t.maxQty,
        discountPercent: t.discountPercent,
      }));
      tiersUniversal = DEFAULT_ISF_VOLUME_DISCOUNT_TIERS.map((t) => ({
        minQty: t.minQty,
        maxQty: t.maxQty,
        discountPercent: t.discountPercent,
      }));
    }

    const payload: FmLiveSyncPayload = {
      ok: errors.length === 0,
      source:
        errors.length === 0
          ? 'database'
          : paperFormats.length || pricingVariables.length || businessRules.length
            ? 'partial'
            : 'fallback',
      updatedAt: new Date().toISOString(),
      paperFormats,
      pricingVariables,
      businessRules,
      supportFaces,
      tiersPos,
      tiersUniversal,
      counts: {
        paperFormats: paperFormats.length,
        pricingVariables: pricingVariables.length,
        businessRules: businessRules.length,
        supportFaces: supportFaces.length,
        paramsLive: 0,
        rulesLive: businessRules.length,
        tiersPos: tiersPos.length,
        tiersUniversal: tiersUniversal.length,
      },
      errors: errors.length ? errors : undefined,
    };

    const liveOverrides = buildLiveParamOverrides(payload);
    payload.counts.paramsLive = countLiveParamHits(FM_PARAMETERS, liveOverrides);

    return NextResponse.json(payload);
  }, {
    fallback: {
      ok: false,
      source: 'fallback',
      updatedAt: new Date().toISOString(),
      paperFormats: [],
      pricingVariables: [],
      businessRules: [],
      supportFaces: [],
      tiersPos: [],
      tiersUniversal: [],
      counts: {
        paperFormats: 0,
        pricingVariables: 0,
        businessRules: 0,
        supportFaces: 0,
        paramsLive: 0,
        rulesLive: 0,
        tiersPos: 0,
        tiersUniversal: 0,
      },
      errors: ['Sync Formules indisponible'],
    } satisfies FmLiveSyncPayload,
  });
}
