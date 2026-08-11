/**
 * Seed / sync paramètres Photobook → runtime + Excel.
 */
import { prisma } from '@/lib/prisma';
import {
  DEFAULT_PHOTOBOOK_PARAMS,
  setPhotobookRuntimeParams,
  type PhotobookParamLike,
} from '@/lib/pricing/photobook-pricing';
import { ensureImpressionSfRuntimeReady } from '@/lib/services/pricing-rules-sync.service';

let ready = false;

export function invalidatePhotobookCache() {
  ready = false;
}

export async function ensurePhotobookParamsSeeded() {
  const count = await prisma.photobookPricingParam.count();
  if (count > 0) return;
  await prisma.photobookPricingParam.create({
    data: {
      excelId: '001',
      code: 'default',
      label: 'Photobook',
      prixPageA4: DEFAULT_PHOTOBOOK_PARAMS.prixPageA4,
      softCoverSupplement: DEFAULT_PHOTOBOOK_PARAMS.softCoverSupplement,
      rigidCoverSupplement: DEFAULT_PHOTOBOOK_PARAMS.rigidCoverSupplement,
      leatherCoverSupplement: DEFAULT_PHOTOBOOK_PARAMS.leatherCoverSupplement,
      customCoverSupplement: DEFAULT_PHOTOBOOK_PARAMS.customCoverSupplement,
      active: true,
      visiblePOS: true,
      details: 'Prix page A4 inclut impression + finition + reliure standard + couverture souple',
    },
  });
}

export async function syncPhotobookParamsToRuntime() {
  const row = await prisma.photobookPricingParam.findFirst({
    where: { active: true },
    orderBy: { updatedAt: 'desc' },
  });
  const params: PhotobookParamLike = row
    ? {
        prixPageA4: row.prixPageA4,
        softCoverSupplement: row.softCoverSupplement,
        rigidCoverSupplement: row.rigidCoverSupplement,
        leatherCoverSupplement: row.leatherCoverSupplement,
        customCoverSupplement: row.customCoverSupplement,
      }
    : DEFAULT_PHOTOBOOK_PARAMS;
  setPhotobookRuntimeParams(params);
  return row;
}

export async function ensurePhotobookParamsReady() {
  if (ready) return;
  await ensureImpressionSfRuntimeReady();
  const { ensurePhotoFormatEquivalencesReady } = await import(
    '@/lib/services/photo-format-equivalences-sync.service'
  );
  await ensurePhotoFormatEquivalencesReady();
  await ensurePhotobookParamsSeeded();
  await syncPhotobookParamsToRuntime();
  ready = true;
}

export async function listPhotobookParams() {
  await ensurePhotobookParamsSeeded();
  return prisma.photobookPricingParam.findMany({ orderBy: { code: 'asc' } });
}

export async function patchPhotobookParam(id: string, data: Record<string, unknown>) {
  const row = await prisma.photobookPricingParam.update({
    where: { id },
    data: data as Parameters<typeof prisma.photobookPricingParam.update>[0]['data'],
  });
  invalidatePhotobookCache();
  await syncPhotobookParamsToRuntime();
  return row;
}

export const PHOTOBOOK_EXCEL_COLUMNS = [
  'ID',
  'ARTICLE',
  'FORMAT',
  'LARGEUR MM',
  'HAUTEUR MM',
  'PRIX PAGE A4',
  'RATIO A4',
  'PRIX PAGE FORMAT',
  'TYPE COUVERTURE',
  'SUPPLÉMENT COUVERTURE',
  'UNITÉ',
  'VISIBLE POS',
  'STATUT',
  'DÉTAIL',
] as const;

export type PhotobookImportReport = {
  read: number;
  created: number;
  updated: number;
  errors: number;
  issues: Array<{ line: number; reason: string }>;
};

function pick(raw: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) {
    const v = raw[k] ?? raw[k.toUpperCase()];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function num(s: string) {
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

/** Import Excel : lignes paramètres (prix A4 + couvertures) — une ligne param + lignes couverture optionnelles. */
export async function importPhotobookParamsFromExcel(
  rows: Record<string, unknown>[],
): Promise<PhotobookImportReport> {
  const report: PhotobookImportReport = { read: rows.length, created: 0, updated: 0, errors: 0, issues: [] };
  let prixPageA4 = DEFAULT_PHOTOBOOK_PARAMS.prixPageA4;
  let soft = DEFAULT_PHOTOBOOK_PARAMS.softCoverSupplement;
  let rigid = DEFAULT_PHOTOBOOK_PARAMS.rigidCoverSupplement;
  let leather = DEFAULT_PHOTOBOOK_PARAMS.leatherCoverSupplement;
  let custom = DEFAULT_PHOTOBOOK_PARAMS.customCoverSupplement;
  let visiblePOS = true;
  let details: string | null = null;
  let excelId = '001';
  let label = 'Photobook';
  let found = false;

  for (let i = 0; i < rows.length; i++) {
    const line = i + 2;
    const raw = rows[i]!;
    try {
      const id = pick(raw, 'ID') || excelId;
      const article = pick(raw, 'ARTICLE') || label;
      const cover = pick(raw, 'TYPE COUVERTURE', 'couverture').toLowerCase();
      const a4 = num(pick(raw, 'PRIX PAGE A4', 'prixPageA4'));
      const supp = num(pick(raw, 'SUPPLÉMENT COUVERTURE', 'supplement'));
      const vis = pick(raw, 'VISIBLE POS');

      if (Number.isFinite(a4) && a4 > 0) {
        prixPageA4 = a4;
        found = true;
      }
      if (cover.includes('souple') && Number.isFinite(supp)) {
        soft = supp;
        found = true;
      } else if (cover.includes('cuir') && Number.isFinite(supp)) {
        leather = supp;
        found = true;
      } else if (cover.includes('personnal') && Number.isFinite(supp)) {
        custom = supp;
        found = true;
      } else if ((cover.includes('rigide') || !cover) && Number.isFinite(supp) && cover) {
        rigid = supp;
        found = true;
      } else if (!cover && Number.isFinite(supp) && supp >= 0) {
        // ligne param générique sans type couverture
        found = true;
      }

      if (vis) visiblePOS = !/non|false|0/i.test(vis);
      const det = pick(raw, 'DÉTAIL', 'DETAIL');
      if (det) details = det;
      excelId = id;
      label = article;
    } catch (e) {
      report.errors++;
      report.issues.push({ line, reason: e instanceof Error ? e.message : 'Erreur' });
    }
  }

  if (!found && rows.length === 0) {
    return report;
  }

  const data = {
    excelId,
    code: 'default',
    label,
    prixPageA4,
    softCoverSupplement: soft,
    rigidCoverSupplement: rigid,
    leatherCoverSupplement: leather,
    customCoverSupplement: custom,
    visiblePOS,
    details,
    active: true,
  };

  const existing = await prisma.photobookPricingParam.findFirst({
    where: { OR: [{ code: 'default' }, { excelId }] },
  });
  if (existing) {
    await prisma.photobookPricingParam.update({ where: { id: existing.id }, data });
    report.updated++;
  } else {
    await prisma.photobookPricingParam.create({ data });
    report.created++;
  }

  invalidatePhotobookCache();
  await syncPhotobookParamsToRuntime();
  return report;
}

export function photobookParamToExcelRows(r: {
  excelId?: string | null;
  label: string;
  prixPageA4: number;
  softCoverSupplement: number;
  rigidCoverSupplement: number;
  leatherCoverSupplement: number;
  customCoverSupplement: number;
  visiblePOS: boolean;
  details?: string | null;
}) {
  const base = {
    ID: r.excelId ?? '001',
    ARTICLE: r.label,
    FORMAT: 'A4',
    'LARGEUR MM': 210,
    'HAUTEUR MM': 297,
    'PRIX PAGE A4': r.prixPageA4,
    'RATIO A4': 1,
    'PRIX PAGE FORMAT': r.prixPageA4,
    UNITÉ: 'page',
    'VISIBLE POS': r.visiblePOS ? 'oui' : 'non',
    STATUT: 'publié',
    DÉTAIL: r.details ?? '',
  };
  return [
    { ...base, 'TYPE COUVERTURE': 'Couverture souple', 'SUPPLÉMENT COUVERTURE': r.softCoverSupplement },
    { ...base, ID: '002', 'TYPE COUVERTURE': 'Couverture rigide', 'SUPPLÉMENT COUVERTURE': r.rigidCoverSupplement },
    { ...base, ID: '003', 'TYPE COUVERTURE': 'Couverture cuir', 'SUPPLÉMENT COUVERTURE': r.leatherCoverSupplement },
    { ...base, ID: '004', 'TYPE COUVERTURE': 'Couverture personnalisée', 'SUPPLÉMENT COUVERTURE': r.customCoverSupplement },
  ];
}
