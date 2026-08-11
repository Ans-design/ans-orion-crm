import { findCatalogueItem } from '@/lib/data/catalogue-meta';
import { prisma } from '@/lib/prisma';
import type { PriceResult } from '@/lib/pricing/price-types';
import { normalizeQty } from '@/lib/pricing/price-types';
import { applyFixedFees, getGlobalPricingConfig } from '@/lib/pricing/global-config';
import { DEFAULT_GLOBAL_PRICING } from '@/lib/data/global-pricing';
import {
  isLambahoanyArticleId,
  isTextileArticleId,
} from '@/lib/pricing/textile-ids';
import {
  applyGfCuttingMarginToUnitPrice,
  extractGfStandardFormatCode,
} from '@/lib/grand-format/cutting-margins';

export {
  TEXTILE_CATALOGUE_IDS,
  isTextileArticleId,
  isLambahoanyArticleId,
} from '@/lib/pricing/textile-ids';

/**
 * Moteur tarifaire Textile :
 * - STANDARD : support vierge + marquage + main d’œuvre (+ options)
 * - SURFACE_M2 (Lambahoany) : surface m² × prix/m² + finition/main d’œuvre
 */

function cfgStr(config: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = config[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function softMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const na = norm(a);
  const nb = norm(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

/** Surface m² depuis config (cm par défaut pour textile grand format / Lambahoany). */
export function resolveTextileSurfaceM2(config: Record<string, unknown>): {
  surfaceM2: number;
  widthCm: number;
  heightCm: number;
  unit: 'cm' | 'mm';
} | null {
  const format = cfgStr(config, 'format');
  let width = Number(config.largeur ?? config.width ?? config.L ?? config.custom_largeur ?? 0);
  let height = Number(config.hauteur ?? config.height ?? config.l ?? config.custom_hauteur ?? 0);
  let unit: 'cm' | 'mm' = /mm/i.test(String(config.unit_dim ?? config.dimension_unit ?? '')) ? 'mm' : 'cm';

  if ((!width || !height) && format) {
    const m = format.match(/(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)?/i);
    if (m) {
      width = Number(String(m[1]).replace(',', '.'));
      height = Number(String(m[2]).replace(',', '.'));
      if (m[3]?.toLowerCase() === 'mm') unit = 'mm';
    }
  }

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;

  const widthCm = unit === 'mm' ? width / 10 : width;
  const heightCm = unit === 'mm' ? height / 10 : height;
  const surfaceM2 = (widthCm / 100) * (heightCm / 100);
  return { surfaceM2, widthCm, heightCm, unit };
}

export type TextileMissingReason =
  | 'Support vierge manquant'
  | 'Prix marquage manquant'
  | 'Main d’œuvre manquante'
  | 'Prix m² Lambahoany manquant'
  | 'Dimensions manquantes'
  | 'Règle textile manquante'
  | null;

export type TextileUnitBreakdown = {
  unitPrice: number;
  supportPrice: number;
  markingPrice: number;
  laborPrice: number;
  finishingPrice: number;
  surfaceM2: number | null;
  prixM2: number | null;
  formula: string;
  missing: TextileMissingReason;
  pipeline: Record<string, unknown>;
  calculable: boolean;
};

export type TextileDbBundle = {
  rule: {
    articleId: string;
    typeCalcul: string;
    utiliseSupportVierge: boolean;
    utiliseMarquage: boolean;
    utiliseMainOeuvre: boolean;
    utiliseSurfaceM2: boolean;
    exceptionLambahoany: boolean;
    status: string;
    active: boolean;
  } | null;
  supports: Array<{
    articleId: string;
    matiere: string | null;
    taille: string | null;
    couleur: string | null;
    typeModele: string | null;
    prixSupportVierge: number;
    unit: string;
    active: boolean;
    status: string;
    visiblePOS: boolean;
  }>;
  markings: Array<{
    technique: string;
    tailleMarquage: string | null;
    zoneMarquage: string | null;
    formatSurface: string | null;
    prixMarquage: number;
    active: boolean;
    status: string;
  }>;
  labors: Array<{
    typeLabor: string;
    techniqueLiee: string | null;
    articleId: string;
    prixLabor: number;
    active: boolean;
    status: string;
  }>;
  tiers: Array<{
    articleId: string;
    qtyMin: number;
    qtyMax: number | null;
    typeRemise: string;
    valeurRemise: number;
    active: boolean;
  }>;
};

function published<T extends { active: boolean; status: string }>(rows: T[]): T[] {
  return rows.filter((r) => r.active && r.status === 'published');
}

function pickSupport(
  supports: TextileDbBundle['supports'],
  articleId: string,
  matiere: string,
  taille: string,
  couleur: string,
  preferUnit: 'pièce' | 'm²',
) {
  const rows = published(supports).filter(
    (s) => s.articleId === articleId && (preferUnit === 'm²' ? /m²|m2/i.test(s.unit) : !/m²|m2/i.test(s.unit)),
  );
  if (!rows.length) return null;

  const scored = rows.map((s) => {
    let score = 0;
    if (matiere && s.matiere && softMatch(s.matiere, matiere)) score += 4;
    if (taille && s.taille && softMatch(s.taille, taille)) score += 4;
    if (couleur && s.couleur && softMatch(s.couleur, couleur)) score += 2;
    if (!matiere && !s.matiere) score += 1;
    if (!taille && !s.taille) score += 1;
    return { s, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best) return null;
  if (matiere || taille) {
    // Exiger au moins une correspondance matière ou taille
    if (best.score < 4) return null;
  }
  return best.s;
}

function pickMarking(
  markings: TextileDbBundle['markings'],
  technique: string,
  tailleMarquage: string,
  zone: string,
) {
  const rows = published(markings);
  if (!rows.length) return null;
  const scored = rows.map((m) => {
    let score = 0;
    if (technique && softMatch(m.technique, technique)) score += 5;
    if (tailleMarquage && m.tailleMarquage && softMatch(m.tailleMarquage, tailleMarquage)) score += 3;
    if (tailleMarquage && m.formatSurface && softMatch(m.formatSurface, tailleMarquage)) score += 3;
    if (zone && m.zoneMarquage && softMatch(m.zoneMarquage, zone)) score += 2;
    return { m, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score < 5) return null;
  return best.m;
}

function pickLabor(
  labors: TextileDbBundle['labors'],
  articleId: string,
  technique: string,
) {
  const rows = published(labors).filter(
    (l) => l.articleId === '*' || l.articleId === articleId || softMatch(l.articleId, articleId),
  );
  if (!rows.length) return null;
  const scored = rows.map((l) => {
    let score = l.articleId === articleId ? 3 : 1;
    if (technique && l.techniqueLiee && softMatch(l.techniqueLiee, technique)) score += 4;
    if (!l.techniqueLiee) score += 1;
    return { l, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.l ?? null;
}

export function computeTextileUnitPrice(
  articleId: string,
  config: Record<string, unknown>,
  bundle: TextileDbBundle,
): TextileUnitBreakdown {
  const pipeline: Record<string, unknown> = { engine: 'textile', articleId };
  const rule = bundle.rule;

  const surfaceMode =
    isLambahoanyArticleId(articleId)
    || rule?.exceptionLambahoany
    || rule?.typeCalcul === 'SURFACE_M2'
    || rule?.utiliseSurfaceM2;

  if (!rule || !rule.active || rule.status !== 'published') {
    // Allow Lambahoany / textile without explicit rule if we have data — but flag missing rule
    if (!surfaceMode && published(bundle.supports).filter((s) => s.articleId === articleId).length === 0) {
      return {
        unitPrice: 0,
        supportPrice: 0,
        markingPrice: 0,
        laborPrice: 0,
        finishingPrice: 0,
        surfaceM2: null,
        prixM2: null,
        formula: '',
        missing: 'Règle textile manquante',
        pipeline,
        calculable: false,
      };
    }
  }

  if (surfaceMode) {
    const surf = resolveTextileSurfaceM2(config);
    if (!surf) {
      return {
        unitPrice: 0,
        supportPrice: 0,
        markingPrice: 0,
        laborPrice: 0,
        finishingPrice: 0,
        surfaceM2: null,
        prixM2: null,
        formula: '',
        missing: 'Dimensions manquantes',
        pipeline,
        calculable: false,
      };
    }
    const matiere = cfgStr(config, 'matiere');
    const support = pickSupport(bundle.supports, articleId, matiere, '', '', 'm²')
      ?? pickSupport(bundle.supports, articleId, matiere, '', '', 'pièce');
    const prixM2 = support?.prixSupportVierge ?? 0;
    if (!support || prixM2 <= 0) {
      return {
        unitPrice: 0,
        supportPrice: 0,
        markingPrice: 0,
        laborPrice: 0,
        finishingPrice: 0,
        surfaceM2: surf.surfaceM2,
        prixM2: null,
        formula: '',
        missing: 'Prix m² Lambahoany manquant',
        pipeline: { ...pipeline, surface: surf },
        calculable: false,
      };
    }
    const technique = cfgStr(config, 'technique', 'technique_impression', 'technique_marquage');
    const useLabor = rule?.utiliseMainOeuvre !== false;
    const labor = useLabor ? pickLabor(bundle.labors, articleId, technique) : null;
    const laborPrice = labor?.prixLabor ?? 0;
    const finishingPrice = Number(config.finition_prix ?? 0) || 0;
    let supportPrice = Math.round(surf.surfaceM2 * prixM2);
    let cuttingNote: string | null = null;
    const fmt = cfgStr(config, 'format');
    if (extractGfStandardFormatCode(fmt)) {
      const cut = applyGfCuttingMarginToUnitPrice(supportPrice, fmt);
      if (cut && cut.marginPercent > 0) {
        supportPrice = cut.finalPrice;
        cuttingNote = `marge découpe ${cut.formatCode} ${cut.marginPercent}%`;
      }
    }
    const unitPrice = supportPrice + laborPrice + finishingPrice;
    const formula = `${surf.surfaceM2.toFixed(4)}×${prixM2}${cuttingNote ? `+${cuttingNote}` : ''}+${laborPrice}+${finishingPrice}`;
    pipeline.surface = surf;
    pipeline.prixM2 = prixM2;
    pipeline.labor = labor ? { type: labor.typeLabor, price: laborPrice } : null;
    pipeline.cutting = cuttingNote;
    return {
      unitPrice,
      supportPrice,
      markingPrice: 0,
      laborPrice,
      finishingPrice,
      surfaceM2: surf.surfaceM2,
      prixM2,
      formula,
      missing: useLabor && !labor ? 'Main d’œuvre manquante' : null,
      pipeline,
      calculable: true,
    };
  }

  const matiere = cfgStr(config, 'matiere');
  const taille =
    cfgStr(config, 'taille', 'taille_bob', 'taille_casquette')
    || (() => {
      const t = config.tailles;
      if (t && typeof t === 'object' && !Array.isArray(t)) {
        const keys = Object.keys(t as Record<string, number>).filter((k) => Number((t as Record<string, number>)[k]) > 0);
        return keys[0] ?? '';
      }
      return '';
    })();
  const couleur = cfgStr(config, 'couleur', 'color');
  const technique = cfgStr(config, 'technique', 'technique_marquage');
  const formatMarquage = cfgStr(config, 'format_marquage', 'taille_marquage');
  const zone = cfgStr(config, 'zone_marquage', 'zone');

  const useSupport = rule?.utiliseSupportVierge !== false;
  const useMarking = rule?.utiliseMarquage !== false;
  const useLabor = rule?.utiliseMainOeuvre !== false;

  const support = useSupport
    ? pickSupport(bundle.supports, articleId, matiere, taille, couleur, 'pièce')
    : null;
  const supportPrice = support?.prixSupportVierge ?? 0;

  if (useSupport && (!support || supportPrice <= 0)) {
    return {
      unitPrice: 0,
      supportPrice: 0,
      markingPrice: 0,
      laborPrice: 0,
      finishingPrice: 0,
      surfaceM2: null,
      prixM2: null,
      formula: '',
      missing: 'Support vierge manquant',
      pipeline: { ...pipeline, matiere, taille, couleur },
      calculable: false,
    };
  }

  const marking = useMarking ? pickMarking(bundle.markings, technique, formatMarquage, zone) : null;
  const markingPrice = marking?.prixMarquage ?? 0;
  if (useMarking && technique && (!marking || markingPrice < 0)) {
    return {
      unitPrice: 0,
      supportPrice,
      markingPrice: 0,
      laborPrice: 0,
      finishingPrice: 0,
      surfaceM2: null,
      prixM2: null,
      formula: '',
      missing: 'Prix marquage manquant',
      pipeline: { ...pipeline, technique, formatMarquage, zone },
      calculable: false,
    };
  }

  const labor = useLabor ? pickLabor(bundle.labors, articleId, technique) : null;
  const laborPrice = labor?.prixLabor ?? 0;
  if (useLabor && (!labor || laborPrice < 0)) {
    return {
      unitPrice: 0,
      supportPrice,
      markingPrice,
      laborPrice: 0,
      finishingPrice: 0,
      surfaceM2: null,
      prixM2: null,
      formula: '',
      missing: 'Main d’œuvre manquante',
      pipeline: { ...pipeline, technique },
      calculable: false,
    };
  }

  const finishingPrice = Number(config.option_prix ?? config.finition_prix ?? 0) || 0;
  const unitPrice = supportPrice + markingPrice + laborPrice + finishingPrice;
  const formula = `${supportPrice}+${markingPrice}+${laborPrice}+${finishingPrice}`;
  pipeline.support = support
    ? { matiere: support.matiere, taille: support.taille, price: supportPrice }
    : null;
  pipeline.marking = marking
    ? { technique: marking.technique, taille: marking.tailleMarquage, price: markingPrice }
    : null;
  pipeline.labor = labor ? { type: labor.typeLabor, price: laborPrice } : null;

  return {
    unitPrice,
    supportPrice,
    markingPrice,
    laborPrice,
    finishingPrice,
    surfaceM2: null,
    prixM2: null,
    formula,
    missing: null,
    pipeline,
    calculable: unitPrice > 0,
  };
}

export function applyTextileDiscount(
  unitPrice: number,
  qty: number,
  tiers: TextileDbBundle['tiers'],
  articleId: string,
): { unitPrice: number; sousTotal: number; remiseRate: number; remiseAmount: number; tier: TextileDbBundle['tiers'][0] | null } {
  const active = tiers.filter(
    (t) => t.active && t.articleId === articleId && qty >= t.qtyMin && (t.qtyMax == null || qty <= t.qtyMax),
  );
  active.sort((a, b) => b.qtyMin - a.qtyMin);
  const tier = active[0] ?? null;
  let finalUnit = unitPrice;
  let remiseRate = 0;
  let sousTotal = unitPrice * qty;
  let remiseAmount = 0;

  if (tier) {
    if (tier.typeRemise === 'percent') {
      remiseRate = tier.valeurRemise / 100;
      remiseAmount = Math.round(sousTotal * remiseRate);
      sousTotal = sousTotal - remiseAmount;
    } else if (tier.typeRemise === 'fixed') {
      remiseAmount = Math.round(tier.valeurRemise);
      sousTotal = Math.max(0, sousTotal - remiseAmount);
      remiseRate = sousTotal > 0 ? remiseAmount / (unitPrice * qty) : 0;
    } else if (tier.typeRemise === 'unit_price') {
      finalUnit = tier.valeurRemise;
      sousTotal = finalUnit * qty;
      remiseAmount = Math.max(0, unitPrice * qty - sousTotal);
      remiseRate = unitPrice > 0 ? remiseAmount / (unitPrice * qty) : 0;
    }
  }

  return { unitPrice: finalUnit, sousTotal, remiseRate, remiseAmount, tier };
}

export async function loadTextileDbBundle(articleId: string): Promise<TextileDbBundle> {
  const [rule, supports, markings, labors, textileTiers, discountTiers] = await Promise.all([
    prisma.textilePricingRule.findFirst({
      where: { articleId, deletedAt: null },
    }),
    prisma.textileBaseSupportPrice.findMany({
      where: { articleId, deletedAt: null },
    }),
    prisma.textileMarkingPrice.findMany({
      where: { deletedAt: null },
    }),
    prisma.textileLaborPrice.findMany({
      where: {
        deletedAt: null,
        OR: [{ articleId }, { articleId: '*' }],
      },
    }),
    prisma.textileDiscountTier.findMany({
      where: { articleId, deletedAt: null },
    }),
    prisma.discountTier.findMany({
      where: { articleId, active: true },
    }).catch(() => []),
  ]);

  const tiers =
    textileTiers.length > 0
      ? textileTiers
      : discountTiers.map((t) => ({
          articleId,
          qtyMin: t.minQty,
          qtyMax: t.maxQty,
          typeRemise: (t.discountPercent ?? 0) > 0 ? 'percent' : 'unit_price',
          valeurRemise: (t.discountPercent ?? 0) > 0 ? t.discountPercent : (t.unitPrice ?? 0),
          active: t.active,
        }));

  return {
    rule: rule
      ? {
          articleId: rule.articleId,
          typeCalcul: rule.typeCalcul,
          utiliseSupportVierge: rule.utiliseSupportVierge,
          utiliseMarquage: rule.utiliseMarquage,
          utiliseMainOeuvre: rule.utiliseMainOeuvre,
          utiliseSurfaceM2: rule.utiliseSurfaceM2,
          exceptionLambahoany: rule.exceptionLambahoany,
          status: rule.status,
          active: rule.active,
        }
      : null,
    supports,
    markings,
    labors,
    tiers,
  };
}

/** Helpers tests acceptation */
export function computeBobExample(support = 5000, marking = 2000, labor = 1000): number {
  return support + marking + labor;
}

export function computeLambahoanyExample(widthCm = 100, heightCm = 150, prixM2 = 20000, labor = 0): number {
  const m2 = (widthCm / 100) * (heightCm / 100);
  return Math.round(m2 * prixM2) + labor;
}

export async function resolveTextilePriceResult(
  articleId: string,
  config: Record<string, unknown>,
  options?: { prixForce?: number; totalForce?: number },
): Promise<PriceResult | null> {
  if (!isTextileArticleId(articleId)) return null;
  const article = findCatalogueItem(articleId);
  if (!article) return null;

  let qty = normalizeQty(config.qty ?? config.quantite ?? config.quantity ?? config.qte ?? 1);
  if (config.tailles && typeof config.tailles === 'object' && !Array.isArray(config.tailles)) {
    qty = Object.values(config.tailles as Record<string, number>).reduce((s, q) => s + (Number(q) || 0), 0) || qty;
  }

  const bundle = await loadTextileDbBundle(articleId);
  const hasAnyAdminData =
    !!bundle.rule
    || bundle.supports.some((s) => s.active && s.status === 'published')
    || bundle.markings.some((m) => m.active && m.status === 'published')
    || bundle.labors.some((l) => l.active && l.status === 'published');

  // Aucune donnée Admin → laisser le fallback priceTiers / prixDepart
  if (!hasAnyAdminData) return null;

  const breakdown = computeTextileUnitPrice(articleId, config, bundle);

  let pricingMode: PriceResult['pricingMode'] = 'auto';
  let unitPrice = breakdown.unitPrice;

  if (options?.prixForce && options.prixForce > 0) {
    unitPrice = options.prixForce;
    pricingMode = 'force_pu';
  }

  const discounted = applyTextileDiscount(unitPrice, qty, bundle.tiers, articleId);
  let sousTotal = discounted.sousTotal;
  let remiseRate = discounted.remiseRate;
  let remiseAmount = discounted.remiseAmount;
  unitPrice = discounted.unitPrice;

  if (options?.totalForce && options.totalForce > 0) {
    sousTotal = options.totalForce;
    unitPrice = qty > 0 ? Math.round(options.totalForce / qty) : options.totalForce;
    pricingMode = 'force_total';
    remiseAmount = 0;
    remiseRate = 0;
  }

  const globalCfg = (await getGlobalPricingConfig().catch(() => null)) ?? DEFAULT_GLOBAL_PRICING;
  const fees = applyFixedFees(
    sousTotal,
    {
      bat: String(config.bat || config.epreuve || ''),
      livraison: String(config.livraison || config.modeLivraison || ''),
    },
    globalCfg,
  );
  const totalHT = fees.totalHT;
  const tvaRate = ((globalCfg.tvaDefault ?? 20) as number) / 100;
  const totalTTC = Math.round(totalHT * (1 + tvaRate));

  return {
    articleId,
    articleLabel: article.name,
    qty,
    prixUnitaire: unitPrice,
    sousTotal,
    remiseRate,
    remiseAmount,
    clicheFee: 0,
    totalHT,
    totalTTC,
    pricingMode,
    formulaApplied: breakdown.formula || undefined,
    snapshot: {
      priceSource: breakdown.calculable ? 'textileAdmin' : 'textileIncomplete',
      textile: breakdown.pipeline,
      missing: breakdown.missing,
      calculable: breakdown.calculable,
      priceNotConfigured: !breakdown.calculable,
      supportPrice: breakdown.supportPrice,
      markingPrice: breakdown.markingPrice,
      laborPrice: breakdown.laborPrice,
      surfaceM2: breakdown.surfaceM2,
      prixM2: breakdown.prixM2,
      tier: discounted.tier,
      adminFixHref: '/administration/textile',
    },
  };
}
