/**
 * Service Admin Packaging — CRUD templates / marges / règles + anomalies.
 */
import { prisma } from '@/lib/prisma';
import {
  parsePackagingMarginExcelRow,
  parsePackagingRuleExcelRow,
  parsePackagingTemplateExcelRow,
  packagingMarginToExcelRow,
  packagingTemplateToExcelRow,
} from '@/lib/backoffice/packaging-excel-format';
import {
  invalidatePackagingPricingRuntime,
  seedPackagingPricingDefaults,
} from '@/lib/services/packaging-pricing-sync.service';

export async function listPackagingAdmin() {
  await seedPackagingPricingDefaults();
  const [templates, margins, rules] = await Promise.all([
    prisma.packagingBoxTemplateRule.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.packagingMarginRule.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.packagingPricingRule.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);
  return { templates, margins, rules };
}

export async function updatePackagingTemplate(id: string, data: Record<string, unknown>) {
  const row = await prisma.packagingBoxTemplateRule.update({
    where: { id },
    data: {
      ...(data.typeBoite != null ? { typeBoite: String(data.typeBoite) } : {}),
      ...(data.formuleKey != null ? { formuleKey: String(data.formuleKey) } : {}),
      ...(data.formuleSurface != null ? { formuleSurface: String(data.formuleSurface) } : {}),
      ...(data.coeffRabats != null ? { coeffRabats: Number(data.coeffRabats) } : {}),
      ...(data.coeffLanguettes != null ? { coeffLanguettes: Number(data.coeffLanguettes) } : {}),
      ...(data.coeffCollage != null ? { coeffCollage: Number(data.coeffCollage) } : {}),
      ...(data.margeDechetsPct != null ? { margeDechetsPct: Number(data.margeDechetsPct) } : {}),
      ...(data.surfaceManuelleAllowed != null ? { surfaceManuelleAllowed: Boolean(data.surfaceManuelleAllowed) } : {}),
      ...(data.actif != null ? { actif: Boolean(data.actif) } : {}),
      ...(data.visiblePos != null ? { visiblePos: Boolean(data.visiblePos) } : {}),
      ...(data.commentaire != null ? { commentaire: String(data.commentaire) } : {}),
    },
  });
  invalidatePackagingPricingRuntime();
  return row;
}

export async function updatePackagingMargin(id: string, data: Record<string, unknown>) {
  const row = await prisma.packagingMarginRule.update({
    where: { id },
    data: {
      ...(data.margeDechetsPct != null ? { margeDechetsPct: Number(data.margeDechetsPct) } : {}),
      ...(data.beneficePct != null ? { beneficePct: Number(data.beneficePct) } : {}),
      ...(data.margeDepensePct != null ? { margeDepensePct: Number(data.margeDepensePct) } : {}),
      ...(data.arrondiMode != null ? { arrondiMode: String(data.arrondiMode) } : {}),
      ...(data.actif != null ? { actif: Boolean(data.actif) } : {}),
      ...(data.visiblePos != null ? { visiblePos: Boolean(data.visiblePos) } : {}),
      ...(data.commentaire != null ? { commentaire: String(data.commentaire) } : {}),
    },
  });
  invalidatePackagingPricingRuntime();
  return row;
}

export async function exportPackagingExcelSheets() {
  const data = await listPackagingAdmin();
  return {
    '02_TYPES_BOITES': data.templates.map(packagingTemplateToExcelRow),
    '05_MARGES_PACKAGING': data.margins.map(packagingMarginToExcelRow),
    '06_REGLES_CALCUL_PACKAGING': data.rules.map((r) => ({
      ID: r.excelId ?? '',
      ARTICLE: r.articleId,
      'TYPE CALCUL': r.typeCalcul,
      FORMULE: r.formule ?? '',
      'SOURCE IMPRESSION': r.sourceImpression,
      'SOURCE FINITIONS': r.sourceFinitions,
      'UTILISE SURFACE': r.utiliseSurface ? 'oui' : 'non',
      'UTILISE BENEFICE': r.utiliseBenefice ? 'oui' : 'non',
      'UTILISE MARGE DEPENSE': r.utiliseMargeDepense ? 'oui' : 'non',
      ACTIF: r.actif ? 'oui' : 'non',
      'VISIBLE POS': r.visiblePos ? 'oui' : 'non',
      COMMENTAIRE: r.commentaire ?? '',
    })),
  };
}

export async function importPackagingExcelSheets(payload: {
  templates?: Record<string, unknown>[];
  margins?: Record<string, unknown>[];
  rules?: Record<string, unknown>[];
}) {
  let templatesUpserted = 0;
  let marginsUpserted = 0;
  let rulesUpserted = 0;

  for (const [i, raw] of (payload.templates ?? []).entries()) {
    const parsed = parsePackagingTemplateExcelRow(raw, i + 2);
    if ('error' in parsed) continue;
    const r = parsed.row;
    if (r.excelId) {
      await prisma.packagingBoxTemplateRule.upsert({
        where: { excelId: r.excelId },
        create: { ...r, excelId: r.excelId },
        update: { ...r },
      });
    } else {
      await prisma.packagingBoxTemplateRule.create({ data: r });
    }
    templatesUpserted += 1;
  }

  for (const [i, raw] of (payload.margins ?? []).entries()) {
    const parsed = parsePackagingMarginExcelRow(raw, i + 2);
    if ('error' in parsed) continue;
    const r = parsed.row;
    if (r.excelId) {
      await prisma.packagingMarginRule.upsert({
        where: { excelId: r.excelId },
        create: { ...r, excelId: r.excelId },
        update: { ...r },
      });
    } else {
      await prisma.packagingMarginRule.create({ data: r });
    }
    marginsUpserted += 1;
  }

  for (const [i, raw] of (payload.rules ?? []).entries()) {
    const parsed = parsePackagingRuleExcelRow(raw, i + 2);
    if ('error' in parsed) continue;
    const r = parsed.row;
    if (r.excelId) {
      await prisma.packagingPricingRule.upsert({
        where: { excelId: r.excelId },
        create: { ...r, excelId: r.excelId },
        update: { ...r },
      });
    } else {
      await prisma.packagingPricingRule.create({ data: r });
    }
    rulesUpserted += 1;
  }

  invalidatePackagingPricingRuntime();
  return { templatesUpserted, marginsUpserted, rulesUpserted };
}

export async function detectPackagingAnomalies() {
  const { templates, margins, rules } = await listPackagingAdmin();
  const anomalies: Array<{ code: string; message: string; severity: 'warning' | 'error' }> = [];

  if (!templates.some((t) => t.actif)) {
    anomalies.push({ code: 'NO_TEMPLATE', message: 'Aucun gabarit boîte actif', severity: 'error' });
  }
  for (const t of templates.filter((x) => x.actif)) {
    if (!t.formuleKey) {
      anomalies.push({
        code: 'TEMPLATE_NO_FORMULA',
        message: `Type « ${t.typeBoite} » sans formule`,
        severity: 'error',
      });
    }
  }
  const global = margins.find((m) => m.scope === 'global' && m.actif);
  if (!global) {
    anomalies.push({ code: 'NO_MARGIN', message: 'Règle de marge globale absente', severity: 'error' });
  } else {
    if (global.beneficePct == null) {
      anomalies.push({ code: 'NO_BENEFICE', message: 'Bénéfice % absent', severity: 'error' });
    }
    if (global.margeDepensePct == null) {
      anomalies.push({ code: 'NO_MARGE_DEPENSE', message: 'Marge dépense % absente', severity: 'error' });
    }
    if (global.margeDechetsPct == null) {
      anomalies.push({ code: 'NO_MARGE_DECHETS', message: 'Marge déchets % absente', severity: 'warning' });
    }
  }
  if (!rules.some((r) => r.actif && r.articleId === 'pkg-boite')) {
    anomalies.push({
      code: 'NO_RULE',
      message: 'Règle de calcul pkg-boite absente',
      severity: 'warning',
    });
  }
  return anomalies;
}
