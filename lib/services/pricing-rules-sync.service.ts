import { DEFAULT_PAPER_FORMAT_RULES } from '@/lib/pricing/paper-format-rules';
import { DEFAULT_SUPPORT_FACE_RULES } from '@/lib/pricing/support-face-rules';
import {
  DEFAULT_MATERIAL_EQUIVALENCES,
  DEFAULT_THICK_PAPER_RULES,
} from '@/lib/pricing/material-equivalence-rules';
import {
  DEFAULT_PRINT_TECHNOLOGY_RULES,
  DEFAULT_SERVICE_EQUIVALENCES,
} from '@/lib/pricing/print-type-rules';
import { setImpressionSfRuntimeRules } from '@/lib/pricing/impression-sf-pricing';
import {
  parsePaperFormatExcelRow,
  parseSupportFaceExcelRow,
  parseMaterialEquivExcelRow,
  parseThickPaperExcelRow,
  parseBlankMaterialExcelRow,
  parseBasePrintingExcelRow,
  parsePrintTechExcelRow,
  parseServiceEquivExcelRow,
  paperFormatToExcelRow,
  supportFaceToExcelRow,
  printTechToExcelRow,
  serviceEquivToExcelRow,
} from '@/lib/backoffice/pricing-rules-excel-format';
import { ansCalcRectoVersoPrice } from '@/lib/pricing/impression-sf-pricing';
import { computePaperFormatPrice } from '@/lib/pricing/paper-format-rules';
import { isRectoVersoAllowedForSupport } from '@/lib/pricing/support-face-rules';
import {
  DEFAULT_ISF_VOLUME_DISCOUNT_TIERS,
  DEFAULT_GENERIC_VOLUME_DISCOUNT_TIERS,
  setPublishedVolumeDiscountTiers,
  VOLUME_TIERS_ISF_ARTICLE_ID,
  VOLUME_TIERS_GENERIC_ARTICLE_ID,
} from '@/lib/pricing/published-volume-tiers';
import { basePrintingToExcelRow } from '@/lib/backoffice/pricing-rules-excel-format';
import { prisma } from '@/lib/prisma';
export type RulesImportReport = {
  read: number;
  created: number;
  updated: number;
  errors: number;
  issues: Array<{ line: number; reason: string }>;
};

function emptyReport(read: number): RulesImportReport {
  return { read, created: 0, updated: 0, errors: 0, issues: [] };
}

/** Seed idempotent si tables vides. */
let pricingRulesSeedComplete = false;
let pricingRulesSeedInflight: Promise<void> | null = null;

export async function ensurePricingRulesSeeded() {
  if (pricingRulesSeedComplete) return;
  if (pricingRulesSeedInflight) return pricingRulesSeedInflight;

  pricingRulesSeedInflight = (async () => {
    const [fmtCount, faceCount, equivCount, thickCount, techCount, svcCount] = await Promise.all([
      prisma.paperFormatRule.count(),
      prisma.supportFaceRule.count(),
      prisma.materialPriceEquivalence.count(),
      prisma.thickPaperRule.count(),
      prisma.printTechnologyRule.count(),
      prisma.servicePriceEquivalence.count(),
    ]);

    const alreadySeeded =
      fmtCount > 0 && faceCount > 0 && equivCount > 0 && thickCount > 0 && techCount > 0 && svcCount > 0;

    // Chemin rapide : DB déjà peuplée — backfill codes manquants + aligner A5 (sans découpe)
    if (alreadySeeded) {
      await ensureVolumeDiscountTiersSeeded();
      // A2 + CARRE90 (ajoutés après seed initial) — toujours garantir présence
      for (const missing of [
        {
          formatCode: 'A2',
          excelId: 'FMT-A2',
          widthMm: 420,
          heightMm: 594,
          ratioA4: 4,
          supplementAr: 0,
          cutAr: 0,
          formula: 'Prix A4 × 4',
          sortOrder: 99,
        },
        {
          formatCode: 'CARRE90',
          excelId: 'FMT-CARRE90',
          widthMm: 90,
          heightMm: 90,
          ratioA4: 0.125,
          supplementAr: 0,
          cutAr: 80,
          formula: 'Prix A4/8 + découpe carré',
          sortOrder: 100,
        },
        // A5 = A4/2 sans découpe (découpe 50 Ar seulement si format < A5)
        {
          formatCode: 'A5',
          excelId: 'FMT-A5',
          widthMm: 148,
          heightMm: 210,
          ratioA4: 0.5,
          supplementAr: 0,
          cutAr: 0,
          formula: 'Prix A4/2',
          sortOrder: 6,
        },
      ] as const) {
        await prisma.paperFormatRule.upsert({
          where: { formatCode: missing.formatCode },
          create: {
            excelId: missing.excelId,
            formatCode: missing.formatCode,
            widthMm: missing.widthMm,
            heightMm: missing.heightMm,
            ratioA4: missing.ratioA4,
            supplementAr: missing.supplementAr,
            cutAr: missing.cutAr,
            formula: missing.formula,
            active: true,
            sortOrder: missing.sortOrder,
          },
          update: {
            widthMm: missing.widthMm,
            heightMm: missing.heightMm,
            ratioA4: missing.ratioA4,
            cutAr: missing.cutAr,
            supplementAr: missing.supplementAr,
            formula: missing.formula,
            active: true,
          },
        });
      }
      pricingRulesSeedComplete = true;
      return;
    }

    if (fmtCount === 0) {
      await prisma.paperFormatRule.createMany({
        data: DEFAULT_PAPER_FORMAT_RULES.map((r, i) => ({
          excelId: `FMT${String(i + 1).padStart(3, '0')}`,
          formatCode: r.formatCode,
          widthMm: r.widthMm,
          heightMm: r.heightMm,
          ratioA4: r.ratioA4,
          supplementAr: r.supplementAr,
          cutAr: r.cutAr,
          formula: r.formula ?? null,
          active: true,
          sortOrder: i,
        })),
      });
    } else {
      // Garantir A2 (ratio 4, sans découpe) même si la table était déjà seedée.
      await prisma.paperFormatRule.upsert({
        where: { formatCode: 'A2' },
        create: {
          excelId: 'FMT-A2',
          formatCode: 'A2',
          widthMm: 420,
          heightMm: 594,
          ratioA4: 4,
          supplementAr: 0,
          cutAr: 0,
          formula: 'Prix A4 × 4',
          active: true,
          sortOrder: 99,
        },
        update: {
          widthMm: 420,
          heightMm: 594,
          ratioA4: 4,
          cutAr: 0,
          formula: 'Prix A4 × 4',
          active: true,
        },
      });
      // A5 = A4/2 sans découpe (découpe 50 Ar seulement si format < A5)
      await prisma.paperFormatRule.upsert({
        where: { formatCode: 'A5' },
        create: {
          excelId: 'FMT-A5',
          formatCode: 'A5',
          widthMm: 148,
          heightMm: 210,
          ratioA4: 0.5,
          supplementAr: 0,
          cutAr: 0,
          formula: 'Prix A4/2',
          active: true,
          sortOrder: 6,
        },
        update: {
          widthMm: 148,
          heightMm: 210,
          ratioA4: 0.5,
          cutAr: 0,
          supplementAr: 0,
          formula: 'Prix A4/2',
          active: true,
        },
      });
    }

    if (faceCount === 0) {
      await prisma.supportFaceRule.createMany({
        data: DEFAULT_SUPPORT_FACE_RULES.map((r, i) => ({
          excelId: `FACE${String(i + 1).padStart(3, '0')}`,
          supportKey: r.supportKey,
          supportLabel: r.supportLabel,
          rectoAllowed: r.rectoAllowed,
          versoAllowed: r.versoAllowed,
          rectoVersoAllowed: r.rectoVersoAllowed,
          reason: r.reason ?? null,
          active: true,
          sortOrder: i,
        })),
      });
    }

    if (equivCount === 0) {
      await prisma.materialPriceEquivalence.createMany({
        data: DEFAULT_MATERIAL_EQUIVALENCES.map((r, i) => ({
          excelId: `EQ${String(i + 1).padStart(3, '0')}`,
          materialKey: r.materialKey,
          materialLabel: r.materialLabel,
          grammageMin: r.grammageMin,
          grammageMax: r.grammageMax,
          referenceMaterial: r.referenceMaterial,
          referenceGrammage: r.referenceGrammage,
          supplementAr: r.supplementAr,
          identicalPrice: r.identicalPrice,
          priceGroup: r.priceGroup ?? null,
          active: true,
          sortOrder: i,
        })),
      });
    } else {
      // Idempotent : Offset 70/100 + membres groupe papier_personnalise manquants
      for (const r of DEFAULT_MATERIAL_EQUIVALENCES.filter(
        (e) => e.priceGroup === 'papier_personnalise'
          || e.materialKey === 'offset_70'
          || e.materialKey === 'offset_100',
      )) {
        const exists = await prisma.materialPriceEquivalence.findFirst({
          where: { materialKey: r.materialKey },
        });
        if (!exists) {
          await prisma.materialPriceEquivalence.create({
            data: {
              materialKey: r.materialKey,
              materialLabel: r.materialLabel,
              grammageMin: r.grammageMin,
              grammageMax: r.grammageMax,
              referenceMaterial: r.referenceMaterial,
              referenceGrammage: r.referenceGrammage,
              supplementAr: r.supplementAr,
              identicalPrice: r.identicalPrice,
              priceGroup: r.priceGroup ?? null,
              active: true,
              details: r.materialKey === 'offset_70'
                ? 'Offset 70G = Offset 80G − 20 Ar'
                : r.materialKey === 'offset_100'
                  ? 'Offset 100G = Offset 90G + 50 Ar'
                  : null,
            },
          });
        } else if (r.materialKey === 'offset_70' || r.materialKey === 'offset_100') {
          // Ne pas écraser si Admin a déjà modifié — seulement si seed d’origine
          if (exists.supplementAr === 0 && !exists.details) {
            await prisma.materialPriceEquivalence.update({
              where: { id: exists.id },
              data: {
                supplementAr: r.supplementAr,
                referenceMaterial: r.referenceMaterial,
                referenceGrammage: r.referenceGrammage,
                grammageMin: r.grammageMin,
                grammageMax: r.grammageMax,
                details: r.materialKey === 'offset_70'
                  ? 'Offset 70G = Offset 80G − 20 Ar'
                  : 'Offset 100G = Offset 90G + 50 Ar',
              },
            });
          }
        }
      }
    }

    if (thickCount === 0) {
      await prisma.thickPaperRule.createMany({
        data: DEFAULT_THICK_PAPER_RULES.map((r, i) => ({
          excelId: `THK${String(i + 1).padStart(3, '0')}`,
          supportType: r.supportType,
          grammageMin: r.grammageMin,
          grammageMax: r.grammageMax,
          formula: r.formula,
          referencePriceKey: r.referencePriceKey,
          supplementAr: r.supplementAr,
          blankMaterialRequired: r.blankMaterialRequired,
          blankLayers: r.blankLayers,
          finishingRequired: r.finishingRequired,
          active: true,
          details: r.details ?? null,
          sortOrder: i,
        })),
      });
    }

    if (techCount === 0) {
      await prisma.printTechnologyRule.createMany({
        data: DEFAULT_PRINT_TECHNOLOGY_RULES.map((r, i) => ({
          excelId: `TECH${String(i + 1).padStart(3, '0')}`,
          ruleCode: r.ruleCode,
          supportScope: r.supportScope,
          printType: r.printType,
          technology: r.technology,
          baseTechnology: r.baseTechnology,
          supplementAr: r.supplementAr,
          active: true,
          details: r.details ?? null,
          sortOrder: i,
        })),
      });
    }

    if (svcCount === 0) {
      await prisma.servicePriceEquivalence.createMany({
        data: DEFAULT_SERVICE_EQUIVALENCES.map((r, i) => ({
          excelId: `SVC${String(i + 1).padStart(3, '0')}`,
          serviceKey: r.serviceKey,
          serviceLabel: r.serviceLabel,
          equivalentKey: r.equivalentKey,
          equivalentLabel: r.equivalentLabel,
          priceRule: r.priceRule,
          supplementAr: r.supplementAr,
          active: true,
          details: r.details ?? null,
          sortOrder: i,
        })),
      });
    }

    // Collage contre-collé dans finitions si absent
    const collage = await prisma.finishingPrice.findFirst({
      where: { name: { contains: 'Collage contre-collé' } },
    });
    if (!collage) {
      await prisma.finishingPrice.create({
        data: {
          excelId: 'FIN-CC-001',
          name: 'Collage contre-collé',
          category: 'Collage',
          unit: 'feuille',
          unitPrice: 500,
          formulaType: 'fixed',
          compatibleFamilies: 'Papier épais, contre-collé',
          visiblePOS: true,
          active: true,
          status: 'published',
          details: 'Utilisé par les règles grammage 400G+ / 600G+',
        },
      });
    }

    await ensureVolumeDiscountTiersSeeded();
    pricingRulesSeedComplete = true;
  })().finally(() => {
    pricingRulesSeedInflight = null;
  });

  return pricingRulesSeedInflight;
}

/** Seed DiscountTier publiés pour remises volume ISF + générique (idempotent si vides). */
let volumeTiersSeedComplete = false;

export async function ensureVolumeDiscountTiersSeeded() {
  if (volumeTiersSeedComplete) return;
  for (const [articleId, label, defaults] of [
    [VOLUME_TIERS_ISF_ARTICLE_ID, 'Impression sans finition', DEFAULT_ISF_VOLUME_DISCOUNT_TIERS],
    [VOLUME_TIERS_GENERIC_ARTICLE_ID, 'Remises volume globales', DEFAULT_GENERIC_VOLUME_DISCOUNT_TIERS],
  ] as const) {
    let profile = await prisma.articlePricingProfile.findUnique({ where: { articleId } });
    if (!profile) {
      profile = await prisma.articlePricingProfile.create({
        data: {
          articleId,
          articleLabel: label,
          family: articleId === VOLUME_TIERS_ISF_ARTICLE_ID ? 'impression' : 'system',
          calculationType: 'piece',
          status: 'published',
          active: true,
          source: 'pricing-rules-seed',
        },
      });
    } else if (profile.status !== 'published') {
      await prisma.articlePricingProfile.update({
        where: { articleId },
        data: { status: 'published', active: true },
      });
    }

    const count = await prisma.discountTier.count({ where: { articleId, active: true } });
    if (count === 0) {
      await prisma.discountTier.createMany({
        data: defaults.map((t) => ({
          articleId,
          minQty: t.minQty,
          maxQty: t.maxQty,
          discountPercent: t.discountPercent,
          unitPrice: null,
          active: true,
          source: 'pricing-rules-seed',
        })),
      });
    }
  }
  volumeTiersSeedComplete = true;
}

export async function syncVolumeDiscountTiersToRuntime() {
  const [isf, generic] = await Promise.all([
    prisma.discountTier.findMany({
      where: { articleId: VOLUME_TIERS_ISF_ARTICLE_ID, active: true },
      orderBy: { minQty: 'asc' },
    }),
    prisma.discountTier.findMany({
      where: { articleId: VOLUME_TIERS_GENERIC_ARTICLE_ID, active: true },
      orderBy: { minQty: 'asc' },
    }),
  ]);
  setPublishedVolumeDiscountTiers({
    isf: isf.length
      ? isf.map((t) => ({
          minQty: t.minQty,
          maxQty: t.maxQty,
          discountPercent: t.discountPercent,
          unitPrice: t.unitPrice,
          active: t.active,
        }))
      : DEFAULT_ISF_VOLUME_DISCOUNT_TIERS,
    generic: generic.length
      ? generic.map((t) => ({
          minQty: t.minQty,
          maxQty: t.maxQty,
          discountPercent: t.discountPercent,
          unitPrice: t.unitPrice,
          active: t.active,
        }))
      : DEFAULT_GENERIC_VOLUME_DISCOUNT_TIERS,
  });
  return { isf: isf.length, generic: generic.length };
}

export async function syncPaperFormatRulesToRuntime() {
  const [formats, faces, tech, services, equivs] = await Promise.all([
    prisma.paperFormatRule.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.supportFaceRule.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.printTechnologyRule.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.servicePriceEquivalence.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.materialPriceEquivalence.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
  ]);
  setImpressionSfRuntimeRules({
    formatRules: formats.length ? formats : DEFAULT_PAPER_FORMAT_RULES,
    faceRules: faces.length ? faces : DEFAULT_SUPPORT_FACE_RULES,
    techRules: tech.length ? tech : DEFAULT_PRINT_TECHNOLOGY_RULES,
    serviceEquivalences: services.length ? services : DEFAULT_SERVICE_EQUIVALENCES,
    materialEquivalences: equivs.length
      ? equivs.map((e) => ({
          materialKey: e.materialKey,
          materialLabel: e.materialLabel,
          grammageMin: e.grammageMin,
          grammageMax: e.grammageMax,
          referenceMaterial: e.referenceMaterial,
          referenceGrammage: e.referenceGrammage,
          supplementAr: e.supplementAr,
          identicalPrice: e.identicalPrice,
          priceGroup: e.priceGroup,
          active: e.active,
        }))
      : DEFAULT_MATERIAL_EQUIVALENCES,
  });
  return {
    formats: formats.length,
    faces: faces.length,
    tech: tech.length,
    services: services.length,
    equivalences: equivs.length,
  };
}

export async function listPaperFormatRules() {
  await ensurePricingRulesSeeded();
  return prisma.paperFormatRule.findMany({ orderBy: [{ sortOrder: 'asc' }, { formatCode: 'asc' }] });
}

export async function listSupportFaceRules() {
  await ensurePricingRulesSeeded();
  return prisma.supportFaceRule.findMany({ orderBy: [{ sortOrder: 'asc' }] });
}

export async function listMaterialEquivalences() {
  await ensurePricingRulesSeeded();
  return prisma.materialPriceEquivalence.findMany({ orderBy: [{ sortOrder: 'asc' }] });
}

export async function listThickPaperRules() {
  await ensurePricingRulesSeeded();
  return prisma.thickPaperRule.findMany({ orderBy: [{ grammageMin: 'asc' }] });
}

export async function listBlankMaterialPrices() {
  return prisma.blankMaterialPrice.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
}

export async function listPrintTechnologyRules() {
  await ensurePricingRulesSeeded();
  return prisma.printTechnologyRule.findMany({ orderBy: [{ sortOrder: 'asc' }] });
}

export async function listServiceEquivalences() {
  await ensurePricingRulesSeeded();
  return prisma.servicePriceEquivalence.findMany({ orderBy: [{ sortOrder: 'asc' }] });
}

export async function importPrintTechFromExcel(rows: Record<string, unknown>[]): Promise<RulesImportReport> {
  const report = emptyReport(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const line = i + 2;
    const parsed = parsePrintTechExcelRow(rows[i]!, line);
    if ('error' in parsed) {
      report.errors++;
      report.issues.push({ line, reason: parsed.error! });
      continue;
    }
    const data = parsed.row;
    try {
      const existing = await prisma.printTechnologyRule.findUnique({ where: { ruleCode: data.ruleCode } });
      if (existing) {
        await prisma.printTechnologyRule.update({ where: { id: existing.id }, data });
        report.updated++;
      } else {
        await prisma.printTechnologyRule.create({ data });
        report.created++;
      }
    } catch (e) {
      report.errors++;
      report.issues.push({ line, reason: e instanceof Error ? e.message : 'Erreur' });
    }
  }
  await syncPaperFormatRulesToRuntime();
  return report;
}

export async function importServiceEquivFromExcel(rows: Record<string, unknown>[]): Promise<RulesImportReport> {
  const report = emptyReport(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const line = i + 2;
    const parsed = parseServiceEquivExcelRow(rows[i]!, line);
    if ('error' in parsed) {
      report.errors++;
      report.issues.push({ line, reason: parsed.error! });
      continue;
    }
    const data = parsed.row;
    try {
      const existing = await prisma.servicePriceEquivalence.findUnique({
        where: { serviceKey_equivalentKey: { serviceKey: data.serviceKey, equivalentKey: data.equivalentKey } },
      });
      if (existing) {
        await prisma.servicePriceEquivalence.update({ where: { id: existing.id }, data });
        report.updated++;
      } else {
        await prisma.servicePriceEquivalence.create({ data });
        report.created++;
      }
    } catch (e) {
      report.errors++;
      report.issues.push({ line, reason: e instanceof Error ? e.message : 'Erreur' });
    }
  }
  await syncPaperFormatRulesToRuntime();
  return report;
}

export async function exportPrintTechExcel() {
  const rows = await listPrintTechnologyRules();
  return rows.map((r) => printTechToExcelRow(r));
}

export async function exportServiceEquivExcel() {
  const rows = await listServiceEquivalences();
  return rows.map((r) => serviceEquivToExcelRow(r));
}

export async function importPaperFormatsFromExcel(rows: Record<string, unknown>[]): Promise<RulesImportReport> {
  const report = emptyReport(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const line = i + 2;
    const parsed = parsePaperFormatExcelRow(rows[i]!, line);
    if ('error' in parsed) {
      report.errors++;
      report.issues.push({ line, reason: parsed.error! });
      continue;
    }
    const data = parsed.row;
    try {
      const existing = await prisma.paperFormatRule.findFirst({
        where: {
          OR: [
            ...(data.excelId ? [{ excelId: data.excelId }] : []),
            { formatCode: data.formatCode },
          ],
        },
      });
      if (existing) {
        await prisma.paperFormatRule.update({ where: { id: existing.id }, data });
        report.updated++;
      } else {
        await prisma.paperFormatRule.create({ data });
        report.created++;
      }
    } catch (e) {
      report.errors++;
      report.issues.push({ line, reason: e instanceof Error ? e.message : 'Erreur' });
    }
  }
  await syncPaperFormatRulesToRuntime();
  return report;
}

export async function importSupportFacesFromExcel(rows: Record<string, unknown>[]): Promise<RulesImportReport> {
  const report = emptyReport(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const line = i + 2;
    const parsed = parseSupportFaceExcelRow(rows[i]!, line);
    if ('error' in parsed) {
      report.errors++;
      report.issues.push({ line, reason: parsed.error! });
      continue;
    }
    const data = parsed.row;
    try {
      const existing = await prisma.supportFaceRule.findFirst({
        where: {
          OR: [
            ...(data.excelId ? [{ excelId: data.excelId }] : []),
            { supportKey: data.supportKey },
          ],
        },
      });
      if (existing) {
        await prisma.supportFaceRule.update({ where: { id: existing.id }, data });
        report.updated++;
      } else {
        await prisma.supportFaceRule.create({ data });
        report.created++;
      }
    } catch (e) {
      report.errors++;
      report.issues.push({ line, reason: e instanceof Error ? e.message : 'Erreur' });
    }
  }
  await syncPaperFormatRulesToRuntime();
  return report;
}

export async function importMaterialEquivalencesFromExcel(rows: Record<string, unknown>[]): Promise<RulesImportReport> {
  const report = emptyReport(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const line = i + 2;
    const parsed = parseMaterialEquivExcelRow(rows[i]!, line);
    if ('error' in parsed) {
      report.errors++;
      report.issues.push({ line, reason: parsed.error! });
      continue;
    }
    const data = parsed.row;
    try {
      const existing = data.excelId
        ? await prisma.materialPriceEquivalence.findFirst({ where: { excelId: data.excelId } })
        : await prisma.materialPriceEquivalence.findFirst({
            where: { materialKey: data.materialKey, grammageMin: data.grammageMin },
          });
      if (existing) {
        await prisma.materialPriceEquivalence.update({ where: { id: existing.id }, data });
        report.updated++;
      } else {
        await prisma.materialPriceEquivalence.create({ data });
        report.created++;
      }
    } catch (e) {
      report.errors++;
      report.issues.push({ line, reason: e instanceof Error ? e.message : 'Erreur' });
    }
  }
  return report;
}

export async function importThickPaperFromExcel(rows: Record<string, unknown>[]): Promise<RulesImportReport> {
  const report = emptyReport(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const line = i + 2;
    const parsed = parseThickPaperExcelRow(rows[i]!, line);
    if ('error' in parsed) {
      report.errors++;
      report.issues.push({ line, reason: parsed.error! });
      continue;
    }
    const data = parsed.row;
    try {
      const existing = data.excelId
        ? await prisma.thickPaperRule.findFirst({ where: { excelId: data.excelId } })
        : await prisma.thickPaperRule.findFirst({ where: { grammageMin: data.grammageMin } });
      if (existing) {
        await prisma.thickPaperRule.update({ where: { id: existing.id }, data });
        report.updated++;
      } else {
        await prisma.thickPaperRule.create({ data });
        report.created++;
      }
    } catch (e) {
      report.errors++;
      report.issues.push({ line, reason: e instanceof Error ? e.message : 'Erreur' });
    }
  }
  return report;
}

export async function importBlankMaterialsFromExcel(rows: Record<string, unknown>[]): Promise<RulesImportReport> {
  const report = emptyReport(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const line = i + 2;
    const parsed = parseBlankMaterialExcelRow(rows[i]!, line);
    if ('error' in parsed) {
      report.errors++;
      report.issues.push({ line, reason: parsed.error! });
      continue;
    }
    const data = parsed.row;
    try {
      const existing = data.excelId
        ? await prisma.blankMaterialPrice.findFirst({ where: { excelId: data.excelId } })
        : await prisma.blankMaterialPrice.findFirst({ where: { name: data.name } });
      if (existing) {
        await prisma.blankMaterialPrice.update({ where: { id: existing.id }, data });
        report.updated++;
      } else {
        await prisma.blankMaterialPrice.create({ data });
        report.created++;
      }
    } catch (e) {
      report.errors++;
      report.issues.push({ line, reason: e instanceof Error ? e.message : 'Erreur' });
    }
  }
  return report;
}

export async function importBasePrintingFromExcel(rows: Record<string, unknown>[]): Promise<RulesImportReport> {
  const report = emptyReport(rows.length);

  async function upsertVariant(opts: {
    articleId: string;
    materialKey: string;
    grammage: string;
    formatLabel: string;
    face: string;
    colorMode: string;
    printTechnology: string;
    saleUnit: string;
    basePrice: number;
    active: boolean;
    publicationStatus: string;
  }) {
    const existing = await prisma.basePrintingPrice.findFirst({
      where: {
        articleId: opts.articleId,
        materialKey: opts.materialKey,
        grammage: opts.grammage,
        formatLabel: opts.formatLabel,
        face: opts.face,
        colorMode: opts.colorMode,
        printTechnology: opts.printTechnology,
      },
    });
    const payload = {
      articleId: opts.articleId,
      materialKey: opts.materialKey,
      grammage: opts.grammage,
      formatLabel: opts.formatLabel,
      face: opts.face,
      colorMode: opts.colorMode,
      printTechnology: opts.printTechnology,
      saleUnit: opts.saleUnit,
      basePrice: opts.basePrice,
      active: opts.active,
      publicationStatus: opts.publicationStatus,
    };
    if (existing) {
      await prisma.basePrintingPrice.update({ where: { id: existing.id }, data: payload });
      report.updated++;
    } else {
      await prisma.basePrintingPrice.create({ data: payload });
      report.created++;
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const line = i + 2;
    const parsed = parseBasePrintingExcelRow(rows[i]!, line);
    if ('error' in parsed) {
      report.errors++;
      report.issues.push({ line, reason: parsed.error! });
      continue;
    }
    const data = parsed.row;
    const variants: Array<{ materialKey: string; colorMode: string; printTechnology: string; price: number }> = [];

    if (data.prixNb && data.prixNb > 0) {
      variants.push({
        materialKey: `${data.materialKey} · N&B`,
        colorMode: 'nb',
        printTechnology: '',
        price: data.prixNb,
      });
    }
    if (data.prixJet && data.prixJet > 0) {
      variants.push({
        materialKey: `${data.materialKey} · Jet`,
        colorMode: 'quadri',
        printTechnology: 'jet',
        price: data.prixJet,
      });
    }
    if (data.prixQuadri && data.prixQuadri > 0 && !data.prixJet) {
      variants.push({
        materialKey: `${data.materialKey} · Couleur`,
        colorMode: 'quadri',
        printTechnology: '',
        price: data.prixQuadri,
      });
    }
    if (data.prixLaser && data.prixLaser > 0) {
      variants.push({
        materialKey: `${data.materialKey} · Laser`,
        colorMode: 'quadri',
        printTechnology: 'laser',
        price: data.prixLaser,
      });
    }
    if (!variants.length && data.basePrice > 0) {
      variants.push({
        materialKey: data.materialKey,
        colorMode: data.colorMode || '',
        printTechnology: data.printTechnology || '',
        price: data.basePrice,
      });
    }
    if (!variants.length && data.publicationStatus === 'published') {
      report.errors++;
      report.issues.push({ line, reason: 'Prix A4 manquant' });
      continue;
    }

    try {
      for (const v of variants) {
        await upsertVariant({
          articleId: data.articleId,
          materialKey: v.materialKey,
          grammage: data.grammage,
          formatLabel: data.formatLabel,
          face: 'recto',
          colorMode: v.colorMode,
          printTechnology: v.printTechnology,
          saleUnit: data.saleUnit,
          basePrice: v.price,
          active: data.active,
          publicationStatus: data.publicationStatus,
        });
      }
      if (data.prixRectoVerso && data.prixRectoVerso > 0) {
        await upsertVariant({
          articleId: data.articleId,
          materialKey: data.materialKey,
          grammage: data.grammage,
          formatLabel: data.formatLabel,
          face: 'recto_verso',
          colorMode: '',
          printTechnology: '',
          saleUnit: data.saleUnit,
          basePrice: data.prixRectoVerso,
          active: data.active,
          publicationStatus: data.publicationStatus,
        });
      }
    } catch (e) {
      report.errors++;
      report.issues.push({ line, reason: e instanceof Error ? e.message : 'Erreur' });
    }
  }
  return report;
}

export async function exportPaperFormatsExcel() {
  const rows = await listPaperFormatRules();
  return rows.map((r) => paperFormatToExcelRow(r));
}

export async function exportSupportFacesExcel() {
  const rows = await listSupportFaceRules();
  return rows.map((r) => supportFaceToExcelRow(r));
}

export async function exportBasePrintingExcel() {
  const rows = await prisma.basePrintingPrice.findMany({
    where: { active: true },
    orderBy: [{ materialKey: 'asc' }, { grammage: 'asc' }, { face: 'asc' }],
  });
  const recto = rows.filter((r) => r.face === 'recto' || r.face === 'Recto');
  const byKey = new Map(
    rows
      .filter((r) => r.face.includes('verso'))
      .map((r) => [`${r.articleId}|${r.materialKey}|${r.grammage}|${r.formatLabel}`, r.basePrice]),
  );
  return recto.map((r) =>
    basePrintingToExcelRow(
      r,
      byKey.get(`${r.articleId}|${r.materialKey}|${r.grammage}|${r.formatLabel}`) ?? null,
    ),
  );
}

export type PricingConsistencyIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
};

export async function verifyPricingConsistency(): Promise<{
  ok: boolean;
  issues: PricingConsistencyIssue[];
}> {
  await ensurePricingRulesSeeded();
  const issues: PricingConsistencyIssue[] = [];
  const formats = await listPaperFormatRules();
  const a4 = formats.find((f) => f.formatCode === 'A4');
  const a5 = formats.find((f) => f.formatCode === 'A5');
  const a6 = formats.find((f) => f.formatCode === 'A6');
  const a3 = formats.find((f) => f.formatCode === 'A3');
  const a3p = formats.find((f) => f.formatCode === 'A3+');

  const testA4 = 1000;
  if (a5) {
    const { price } = computePaperFormatPrice(testA4, a5, formats);
    if (price !== 500 || a5.cutAr !== 0) {
      issues.push({
        code: 'A5_FORMULA',
        severity: 'error',
        message: `A5 attendu 500 (A4/2 sans découpe), obtenu ${price} (cutAr=${a5.cutAr})`,
      });
    }
  }
  if (a6) {
    const { price } = computePaperFormatPrice(testA4, a6, formats);
    if (price !== 300) {
      issues.push({
        code: 'A6_FORMULA',
        severity: 'error',
        message: `A6 attendu 300, obtenu ${price}`,
      });
    }
  }
  if (a3) {
    const { price } = computePaperFormatPrice(testA4, a3, formats);
    if (price !== 2000) {
      issues.push({
        code: 'A3_FORMULA',
        severity: 'error',
        message: `A3 attendu 2000, obtenu ${price}`,
      });
    }
  }
  if (a3p) {
    const { price } = computePaperFormatPrice(testA4, a3p, formats);
    if (price !== 2200) {
      issues.push({
        code: 'A3PLUS_FORMULA',
        severity: 'error',
        message: `A3+ attendu 2200, obtenu ${price}`,
      });
    }
  }
  if (!a4) {
    issues.push({ code: 'A4_MISSING', severity: 'error', message: 'Règle format A4 absente' });
  }

  const faces = await listSupportFaceRules();
  for (const key of ['autocollant', 'pvc_transl', 'sublimation', 'vinyle']) {
    if (isRectoVersoAllowedForSupport(key, faces)) {
      issues.push({
        code: 'FACE_LOCK',
        severity: 'warning',
        message: `Support ${key} devrait interdire le recto-verso`,
      });
    }
  }

  const collage = await prisma.finishingPrice.findFirst({
    where: { name: { contains: 'Collage contre-collé' }, active: true },
  });
  if (!collage) {
    issues.push({
      code: 'COLLAGE_CC',
      severity: 'warning',
      message: 'Finition « Collage contre-collé » absente',
    });
  }

  const publishedIsf = await prisma.basePrintingPrice.count({
    where: { publicationStatus: 'published', active: true },
  });
  if (publishedIsf === 0) {
    issues.push({
      code: 'ISF_EMPTY',
      severity: 'warning',
      message: 'Aucun BasePrintingPrice publié — fallback tarifs TS possible',
    });
  }

  const isfTiers = await prisma.discountTier.count({
    where: { articleId: VOLUME_TIERS_ISF_ARTICLE_ID, active: true },
  });
  if (isfTiers === 0) {
    issues.push({
      code: 'VOLUME_TIERS_ISF',
      severity: 'warning',
      message: 'Aucun DiscountTier volume ISF publié',
    });
  }

  const laserRule = await prisma.printTechnologyRule.findFirst({
    where: { ruleCode: 'LASER_QUADRI_OFFSET', active: true },
  });
  if (!laserRule) {
    issues.push({
      code: 'LASER_SUPPLEMENT',
      severity: 'error',
      message: 'Règle LASER_QUADRI_OFFSET absente',
    });
  } else if (laserRule.supplementAr < 0) {
    issues.push({
      code: 'LASER_SUPPLEMENT_NEG',
      severity: 'error',
      message: 'Supplément laser négatif',
    });
  }

  const photoEq = await prisma.servicePriceEquivalence.findFirst({
    where: { serviceKey: 'photocopie', active: true },
  });
  if (!photoEq) {
    issues.push({
      code: 'PHOTOCOPIE_EQ',
      severity: 'warning',
      message: 'Équivalence Photocopie = Impression absente',
    });
  }

  return { ok: issues.filter((i) => i.severity === 'error').length === 0, issues };
}

export async function syncAllPricingRules() {
  await ensurePricingRulesSeeded();
  const runtime = await syncPaperFormatRulesToRuntime();
  const volume = await syncVolumeDiscountTiersToRuntime();
  // DirectSale → DiscountTier déjà via syncDirectSaleArticleToPos (source unifiée)
  const consistency = await verifyPricingConsistency();
  invalidateImpressionSfRuntimeCache();
  return { ...runtime, volume, consistency };
}

let runtimeReady = false;
let runtimeInflight: Promise<void> | null = null;

/** Charge seed + runtime une fois par process (POS / calculate). */
export async function ensureImpressionSfRuntimeReady() {
  if (runtimeReady) return;
  if (runtimeInflight) return runtimeInflight;
  runtimeInflight = (async () => {
    await ensurePricingRulesSeeded();
    // Sync runtime une seule fois (seed ne le fait plus à chaque appel)
    await Promise.all([syncPaperFormatRulesToRuntime(), syncVolumeDiscountTiersToRuntime()]);
    runtimeReady = true;
  })().finally(() => {
    runtimeInflight = null;
  });
  return runtimeInflight;
}

export function invalidateImpressionSfRuntimeCache() {
  runtimeReady = false;
  // seed reste valide — on rechargera seulement formats / paliers depuis DB
}

/** Alias plan — sync formats + faces vers runtime moteur. */
export async function syncPaperFormatRules() {
  invalidateImpressionSfRuntimeCache();
  return syncPaperFormatRulesToRuntime();
}

/** Alias plan — sync règles recto/verso (même runtime que formats). */
export async function syncRectoVersoRules() {
  invalidateImpressionSfRuntimeCache();
  return syncPaperFormatRulesToRuntime();
}

/**
 * Recalcule / resync prix POS liés aux règles (volume + formats).
 * Les prix unitaires article restent en BasePrintingPrice / DirectSale — pas de hardcode.
 */
export async function recalculatePosPrices() {
  invalidateImpressionSfRuntimeCache();
  const volume = await syncVolumeDiscountTiersToRuntime();
  const formats = await syncPaperFormatRulesToRuntime();
  return { volume, formats };
}

export { ansCalcRectoVersoPrice };
