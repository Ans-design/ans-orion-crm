/**
 * Seed / sync paramètres Tirage photo → runtime + Excel.
 */
import { prisma } from '@/lib/prisma';
import {
  DEFAULT_TIRAGE_PHOTO_PARAMS,
  setTiragePhotoRuntimeParams,
  type TiragePhotoParamLike,
  computeTiragePhotoPrice,
} from '@/lib/pricing/tirage-photo-pricing';
import { ensureImpressionSfRuntimeReady } from '@/lib/services/pricing-rules-sync.service';
import { getImpressionSfFormatRules } from '@/lib/pricing/impression-sf-pricing';
import { computePaperFormatPrice } from '@/lib/pricing/paper-format-rules';

let ready = false;

export function invalidateTiragePhotoCache() {
  ready = false;
}

export async function ensureTiragePhotoParamsSeeded() {
  const count = await prisma.tiragePhotoPricingParam.count();
  if (count > 0) return;
  await prisma.tiragePhotoPricingParam.create({
    data: {
      excelId: '001',
      code: 'default',
      label: 'Tirage photo',
      prixBaseA4: DEFAULT_TIRAGE_PHOTO_PARAMS.prixBaseA4,
      active: true,
      visiblePOS: true,
      details: 'Papier photo A4 — type papier sans impact prix. Formats = règles ISF (découpe/suppléments).',
    },
  });
}

export async function syncTiragePhotoParamsToRuntime() {
  const row = await prisma.tiragePhotoPricingParam.findFirst({
    where: { active: true },
    orderBy: { updatedAt: 'desc' },
  });
  const params: TiragePhotoParamLike = row
    ? { prixBaseA4: row.prixBaseA4 }
    : DEFAULT_TIRAGE_PHOTO_PARAMS;
  setTiragePhotoRuntimeParams(params);
  return row;
}

/** Purge l’ancien prix catalogue 350 Ar — le prix vient de TiragePhotoPricingParam (A4). */
export async function clearStaleTiragePhotoProfilePrixBase() {
  try {
    await prisma.articlePricingProfile.updateMany({
      where: {
        OR: [
          { articleId: 'ph-tirage' },
          { articleId: { startsWith: 'ph-tirage-' } },
          { articleLabel: { equals: 'Tirage photo' } },
          { articleLabel: { startsWith: 'Tirage photo ' } },
        ],
        prixBase: { not: null },
      },
      data: { prixBase: null },
    });
  } catch {
    /* table absente en CI partielle */
  }
}

export async function ensureTiragePhotoParamsReady() {
  if (ready) return;
  await ensureImpressionSfRuntimeReady();
  const { ensurePhotoFormatEquivalencesReady } = await import(
    '@/lib/services/photo-format-equivalences-sync.service'
  );
  await ensurePhotoFormatEquivalencesReady();
  await ensureTiragePhotoParamsSeeded();
  await syncTiragePhotoParamsToRuntime();
  await clearStaleTiragePhotoProfilePrixBase();
  // Fusion DB : archiver AVD032–035 / « Tirage photo A4… » pour qu'ils ne reviennent pas
  try {
    const { mergePhotoPrintArticles } = await import(
      '@/lib/services/merge-photo-print-articles.service'
    );
    await mergePhotoPrintArticles();
  } catch {
    /* ignore si tables absentes */
  }
  ready = true;
}

export async function listTiragePhotoParams() {
  await ensureTiragePhotoParamsSeeded();
  return prisma.tiragePhotoPricingParam.findMany({ orderBy: { code: 'asc' } });
}

export async function patchTiragePhotoParam(id: string, data: Record<string, unknown>) {
  const row = await prisma.tiragePhotoPricingParam.update({
    where: { id },
    data: data as Parameters<typeof prisma.tiragePhotoPricingParam.update>[0]['data'],
  });
  invalidateTiragePhotoCache();
  await syncTiragePhotoParamsToRuntime();
  return row;
}

export const TIRAGE_PHOTO_EXCEL_COLUMNS = [
  'ID',
  'ARTICLE',
  'FORMAT',
  'LARGEUR MM',
  'HAUTEUR MM',
  'FORMAT FACTURATION',
  'RATIO A4',
  'PRIX BASE A4',
  'DÉCOUPE AR',
  'SUPPLÉMENT AR',
  'PRIX CALCULÉ',
  'TYPE PAPIER',
  'IMPACT PRIX TYPE PAPIER',
  'VISIBLE POS',
  'STATUT',
  'DÉTAIL',
] as const;

export type TirageImportReport = {
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

/** Import : met à jour le prix base A4 (et métadonnées). Découpe/suppléments = PaperFormatRule Admin. */
export async function importTiragePhotoFromExcel(
  rows: Record<string, unknown>[],
): Promise<TirageImportReport> {
  const report: TirageImportReport = { read: rows.length, created: 0, updated: 0, errors: 0, issues: [] };
  let prixBaseA4 = DEFAULT_TIRAGE_PHOTO_PARAMS.prixBaseA4;
  let found = false;
  let excelId = '001';
  let label = 'Tirage photo';
  let visiblePOS = true;
  let details: string | null = null;

  for (let i = 0; i < rows.length; i++) {
    const line = i + 2;
    const raw = rows[i]!;
    try {
      const a4 = num(pick(raw, 'PRIX BASE A4', 'prixBaseA4'));
      if (Number.isFinite(a4) && a4 > 0) {
        prixBaseA4 = a4;
        found = true;
      }
      const id = pick(raw, 'ID');
      if (id) excelId = id;
      const art = pick(raw, 'ARTICLE');
      if (art) label = art;
      const vis = pick(raw, 'VISIBLE POS');
      if (vis) visiblePOS = !/non|false|0/i.test(vis);
      const det = pick(raw, 'DÉTAIL', 'DETAIL');
      if (det) details = det;
    } catch (e) {
      report.errors++;
      report.issues.push({ line, reason: e instanceof Error ? e.message : 'Erreur' });
    }
  }

  if (!found && rows.length === 0) return report;

  const data = {
    excelId,
    code: 'default',
    label,
    prixBaseA4,
    visiblePOS,
    details,
    active: true,
  };

  const existing = await prisma.tiragePhotoPricingParam.findFirst({
    where: { OR: [{ code: 'default' }, { excelId }] },
  });
  if (existing) {
    await prisma.tiragePhotoPricingParam.update({ where: { id: existing.id }, data });
    report.updated++;
  } else {
    await prisma.tiragePhotoPricingParam.create({ data });
    report.created++;
  }

  invalidateTiragePhotoCache();
  await syncTiragePhotoParamsToRuntime();
  return report;
}

/** Export : une ligne par format ISF actif + prix calculé depuis base A4. */
export function tiragePhotoParamToExcelRows(r: {
  excelId?: string | null;
  label: string;
  prixBaseA4: number;
  visiblePOS: boolean;
  details?: string | null;
}) {
  const rules = getImpressionSfFormatRules().filter((x) => x.active !== false);
  const formats = ['A6', 'A5', 'A4', 'A3', 'A3+', 'DL', 'A7'];
  const rows = [];
  let i = 0;
  for (const code of formats) {
    const rule = rules.find((x) => x.formatCode === code);
    if (!rule) continue;
    i += 1;
    const { price } = computePaperFormatPrice(r.prixBaseA4, rule, rules);
    rows.push({
      ID: String(i).padStart(3, '0'),
      ARTICLE: r.label,
      FORMAT: code,
      'LARGEUR MM': rule.widthMm,
      'HAUTEUR MM': rule.heightMm,
      'FORMAT FACTURATION': code,
      'RATIO A4': rule.ratioA4,
      'PRIX BASE A4': r.prixBaseA4,
      'DÉCOUPE AR': rule.cutAr,
      'SUPPLÉMENT AR': rule.supplementAr,
      'PRIX CALCULÉ': price,
      'TYPE PAPIER': 'Tous (même prix)',
      'IMPACT PRIX TYPE PAPIER': 'non',
      'VISIBLE POS': r.visiblePOS ? 'oui' : 'non',
      STATUT: 'publié',
      DÉTAIL: r.details ?? '',
    });
  }
  // Ligne param générique si aucun format
  if (!rows.length) {
    rows.push({
      ID: r.excelId ?? '001',
      ARTICLE: r.label,
      FORMAT: 'A4',
      'LARGEUR MM': 210,
      'HAUTEUR MM': 297,
      'FORMAT FACTURATION': 'A4',
      'RATIO A4': 1,
      'PRIX BASE A4': r.prixBaseA4,
      'DÉCOUPE AR': 0,
      'SUPPLÉMENT AR': 0,
      'PRIX CALCULÉ': r.prixBaseA4,
      'TYPE PAPIER': 'Tous (même prix)',
      'IMPACT PRIX TYPE PAPIER': 'non',
      'VISIBLE POS': r.visiblePOS ? 'oui' : 'non',
      STATUT: 'publié',
      DÉTAIL: r.details ?? '',
    });
  }
  return rows;
}

/** Helper test / preview */
export function previewTiragePrice(format: string, prixBaseA4 = DEFAULT_TIRAGE_PHOTO_PARAMS.prixBaseA4) {
  setTiragePhotoRuntimeParams({ prixBaseA4 });
  return computeTiragePhotoPrice({ format }, { prixBaseA4 });
}
