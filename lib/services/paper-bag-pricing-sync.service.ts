/**
 * Sync runtime Sac papier depuis Prisma (+ seed défauts).
 */
import {
  DEFAULT_PAPER_BAG_ACCESSORIES,
  DEFAULT_PAPER_BAG_MARGIN,
  DEFAULT_PAPER_BAG_TEMPLATES,
  setPaperBagRuntime,
  type PaperBagAccessoryDefault,
  type PaperBagMarginDefault,
  type PaperBagTemplateDefault,
} from '@/lib/packaging/paper-bag-admin-defaults';
import type { PackagingArrondiMode } from '@/lib/packaging/packaging-a4-equivalence';

let readyPromise: Promise<void> | null = null;

export async function ensurePaperBagPricingRuntimeReady(): Promise<void> {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    try {
      const { prisma } = await import('@/lib/prisma');
      const [templates, margins, accessories] = await Promise.all([
        prisma.paperBagTemplateRule.findMany({ where: { actif: true }, orderBy: { sortOrder: 'asc' } }),
        prisma.paperBagMarginRule.findMany({ where: { actif: true }, orderBy: { sortOrder: 'asc' } }),
        prisma.paperBagAccessoryPrice.findMany({ where: { actif: true }, orderBy: { sortOrder: 'asc' } }),
      ]);

      const mappedT: PaperBagTemplateDefault[] = templates.length
        ? templates.map((t) => ({
            typeSac: t.typeSac,
            formuleSurface: t.formuleSurface ?? '',
            coefficientFond: t.coefficientFond,
            rabatHautMm: t.rabatHautMm,
            patteCollageMm: t.patteCollageMm,
            margeDechetsPct: t.margeDechetsPct,
            actif: t.actif,
            visiblePos: t.visiblePos,
            commentaire: t.commentaire ?? '',
          }))
        : DEFAULT_PAPER_BAG_TEMPLATES;

      const global = margins.find((m) => m.scope === 'global') ?? margins[0];
      const mappedM: PaperBagMarginDefault = global
        ? {
            scope: 'global',
            articleId: global.articleId,
            typeSac: global.typeSac,
            margeDechetsPct: global.margeDechetsPct,
            beneficePct: global.beneficePct,
            margeDepensePct: global.margeDepensePct,
            arrondiMode: (global.arrondiMode as PackagingArrondiMode) || 'exact',
            actif: global.actif,
            commentaire: global.commentaire ?? '',
          }
        : DEFAULT_PAPER_BAG_MARGIN;

      const mappedA: PaperBagAccessoryDefault[] = accessories.length
        ? accessories.map((a) => ({
            accessoire: a.accessoire,
            type: a.type ?? undefined,
            unite: a.unite,
            prixHt: a.prixHt,
          }))
        : DEFAULT_PAPER_BAG_ACCESSORIES;

      setPaperBagRuntime({ templates: mappedT, margin: mappedM, accessories: mappedA });
    } catch {
      setPaperBagRuntime({
        templates: DEFAULT_PAPER_BAG_TEMPLATES,
        margin: DEFAULT_PAPER_BAG_MARGIN,
        accessories: DEFAULT_PAPER_BAG_ACCESSORIES,
      });
    }
  })();
  return readyPromise;
}

export function invalidatePaperBagPricingRuntime() {
  readyPromise = null;
}

export async function seedPaperBagPricingDefaults(): Promise<Record<string, number>> {
  const { prisma } = await import('@/lib/prisma');
  const counts: Record<string, number> = {};

  if ((await prisma.paperBagTemplateRule.count()) === 0) {
    for (const [i, t] of DEFAULT_PAPER_BAG_TEMPLATES.entries()) {
      await prisma.paperBagTemplateRule.create({
        data: {
          excelId: `SAC-TPL-${i + 1}`,
          typeSac: t.typeSac,
          formuleSurface: t.formuleSurface,
          coefficientFond: t.coefficientFond,
          rabatHautMm: t.rabatHautMm,
          patteCollageMm: t.patteCollageMm,
          margeDechetsPct: t.margeDechetsPct,
          commentaire: t.commentaire,
          sortOrder: i,
        },
      });
      counts.templates = (counts.templates ?? 0) + 1;
    }
  }

  if ((await prisma.paperBagMarginRule.count()) === 0) {
    await prisma.paperBagMarginRule.create({
      data: {
        excelId: 'SAC-MARGE-1',
        scope: 'global',
        articleId: 'pkg-sac',
        margeDechetsPct: 10,
        beneficePct: 30,
        margeDepensePct: 10,
        arrondiMode: 'exact',
        commentaire: DEFAULT_PAPER_BAG_MARGIN.commentaire,
      },
    });
    counts.margins = 1;
  }

  if ((await prisma.paperBagAccessoryPrice.count()) === 0) {
    for (const [i, a] of DEFAULT_PAPER_BAG_ACCESSORIES.entries()) {
      await prisma.paperBagAccessoryPrice.create({
        data: {
          excelId: `SAC-ACC-${i + 1}`,
          accessoire: a.accessoire,
          type: a.type,
          unite: a.unite,
          prixHt: a.prixHt,
          sortOrder: i,
        },
      });
      counts.accessories = (counts.accessories ?? 0) + 1;
    }
  }

  if ((await prisma.paperBagPricingRule.count()) === 0) {
    await prisma.paperBagPricingRule.create({
      data: {
        excelId: 'SAC-RULE-1',
        articleId: 'pkg-sac',
        typeCalcul: 'surface_isf_finitions_accessoires',
        sourceImpression: 'impression_sf',
        sourceFinitions: 'finishing_price',
      },
    });
    counts.rules = 1;
  }

  invalidatePaperBagPricingRuntime();
  return counts;
}
