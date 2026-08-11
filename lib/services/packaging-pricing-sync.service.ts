/**
 * Seed / sync runtime des règles Packaging depuis Prisma (+ défauts code).
 */
import {
  DEFAULT_PACKAGING_MARGIN,
  DEFAULT_PACKAGING_TEMPLATES,
  setPackagingPricingRuntime,
  type PackagingBoxTemplateDefault,
  type PackagingMarginDefaults,
} from '@/lib/packaging/packaging-admin-defaults';
import type { PackagingArrondiMode } from '@/lib/packaging/packaging-a4-equivalence';

let readyPromise: Promise<void> | null = null;

export async function ensurePackagingPricingRuntimeReady(): Promise<void> {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    try {
      const { prisma } = await import('@/lib/prisma');
      const [templates, margins] = await Promise.all([
        prisma.packagingBoxTemplateRule.findMany({ where: { actif: true }, orderBy: { sortOrder: 'asc' } }),
        prisma.packagingMarginRule.findMany({ where: { actif: true }, orderBy: { sortOrder: 'asc' } }),
      ]);

      if (templates.length) {
        const mapped: PackagingBoxTemplateDefault[] = templates.map((t) => ({
          typeBoite: t.typeBoite,
          formuleKey: t.formuleKey as PackagingBoxTemplateDefault['formuleKey'],
          formuleSurface: t.formuleSurface ?? '',
          coeffRabats: t.coeffRabats,
          coeffLanguettes: t.coeffLanguettes,
          coeffCollage: t.coeffCollage,
          margeDechetsPct: t.margeDechetsPct,
          surfaceManuelleAllowed: t.surfaceManuelleAllowed,
          actif: t.actif,
          visiblePos: t.visiblePos,
          commentaire: t.commentaire ?? '',
        }));
        setPackagingPricingRuntime({ templates: mapped });
      }

      const global = margins.find((m) => m.scope === 'global') ?? margins[0];
      if (global) {
        const margin: PackagingMarginDefaults = {
          scope: 'global',
          articleId: global.articleId,
          typeBoite: global.typeBoite,
          margeDechetsPct: global.margeDechetsPct,
          beneficePct: global.beneficePct,
          margeDepensePct: global.margeDepensePct,
          arrondiMode: (global.arrondiMode as PackagingArrondiMode) || 'exact',
          actif: global.actif,
          commentaire: global.commentaire ?? '',
        };
        setPackagingPricingRuntime({ margin });
      }
    } catch {
      // Prisma models absents / DB offline → défauts code
      setPackagingPricingRuntime({
        templates: DEFAULT_PACKAGING_TEMPLATES,
        margin: DEFAULT_PACKAGING_MARGIN,
      });
    }
  })();
  return readyPromise;
}

export function invalidatePackagingPricingRuntime() {
  readyPromise = null;
}

/** Upsert défauts si tables vides — appelé par Admin / seed. */
export async function seedPackagingPricingDefaults(): Promise<{
  templates: number;
  margins: number;
  rules: number;
}> {
  const { prisma } = await import('@/lib/prisma');
  let templates = 0;
  let margins = 0;
  let rules = 0;

  const tplCount = await prisma.packagingBoxTemplateRule.count();
  if (tplCount === 0) {
    for (const [i, t] of DEFAULT_PACKAGING_TEMPLATES.entries()) {
      await prisma.packagingBoxTemplateRule.create({
        data: {
          excelId: `PKG-TPL-${String(i + 1).padStart(3, '0')}`,
          typeBoite: t.typeBoite,
          formuleKey: t.formuleKey,
          formuleSurface: t.formuleSurface,
          coeffRabats: t.coeffRabats,
          coeffLanguettes: t.coeffLanguettes,
          coeffCollage: t.coeffCollage,
          margeDechetsPct: t.margeDechetsPct,
          surfaceManuelleAllowed: t.surfaceManuelleAllowed,
          actif: t.actif,
          visiblePos: t.visiblePos,
          commentaire: t.commentaire || null,
          sortOrder: i,
        },
      });
      templates += 1;
    }
  }

  const marginCount = await prisma.packagingMarginRule.count();
  if (marginCount === 0) {
    await prisma.packagingMarginRule.create({
      data: {
        excelId: 'PKG-MAR-001',
        scope: 'global',
        articleId: 'pkg-boite',
        margeDechetsPct: DEFAULT_PACKAGING_MARGIN.margeDechetsPct,
        beneficePct: DEFAULT_PACKAGING_MARGIN.beneficePct,
        margeDepensePct: DEFAULT_PACKAGING_MARGIN.margeDepensePct,
        arrondiMode: DEFAULT_PACKAGING_MARGIN.arrondiMode,
        actif: true,
        visiblePos: true,
        commentaire: DEFAULT_PACKAGING_MARGIN.commentaire,
        sortOrder: 0,
      },
    });
    margins = 1;
  }

  const ruleCount = await prisma.packagingPricingRule.count();
  if (ruleCount === 0) {
    await prisma.packagingPricingRule.create({
      data: {
        excelId: 'PKG-RUL-001',
        articleId: 'pkg-boite',
        typeCalcul: 'surface_isf_finitions',
        formule: 'depenses × (1 + benefice% + margeDepense%)',
        sourceImpression: 'impression_sf',
        sourceFinitions: 'finishing_price',
        utiliseSurface: true,
        utiliseBenefice: true,
        utiliseMargeDepense: true,
        actif: true,
        visiblePos: true,
        commentaire: 'Moteur Boîte personnalisée ANS',
        sortOrder: 0,
      },
    });
    rules = 1;
  }

  invalidatePackagingPricingRuntime();
  await ensurePackagingPricingRuntimeReady();
  return { templates, margins, rules };
}
