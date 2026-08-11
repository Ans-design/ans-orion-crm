/**
 * Seed / sync formats tampon → runtime pricing + Excel.
 */
import { prisma } from '@/lib/prisma';
import {
  DEFAULT_STAMP_FORMATS,
  type StampFormatLike,
} from '@/lib/pricing/stamp-format-rules';
import { setStampFormatsRuntime } from '@/lib/pricing/stamp-pricing';

let ready = false;

export function invalidateStampFormatsCache() {
  ready = false;
}

function padExcelId(n: number): string {
  return String(n).padStart(3, '0');
}

export async function ensureStampFormatsSeeded() {
  const count = await prisma.stampFormatPrice.count();
  if (count > 0) return;
  let i = 0;
  for (const f of DEFAULT_STAMP_FORMATS) {
    i += 1;
    await prisma.stampFormatPrice.create({
      data: {
        excelId: padExcelId(i),
        articleLabel: 'Tampon',
        stampType: f.stampType,
        formatLabel: f.formatLabel,
        widthMm: f.widthMm,
        heightMm: f.heightMm,
        reference: f.reference ?? null,
        unitPrice: f.unitPrice,
        unit: 'pièce',
        allowCustomFormat: true,
        visiblePOS: true,
        status: 'published',
        sortOrder: i,
        active: true,
      },
    });
  }
}

export async function syncStampFormatsToRuntime() {
  const rows = await prisma.stampFormatPrice.findMany({
    where: { active: true, status: 'published', visiblePOS: true },
    orderBy: [{ sortOrder: 'asc' }, { widthMm: 'asc' }],
  });
  const formats: StampFormatLike[] = rows.map((r) => ({
    id: r.id,
    stampType: r.stampType,
    formatLabel: r.formatLabel,
    widthMm: r.widthMm,
    heightMm: r.heightMm,
    unitPrice: r.unitPrice,
    reference: r.reference,
    allowCustomFormat: r.allowCustomFormat,
    active: r.active,
    status: r.status,
  }));
  setStampFormatsRuntime(formats.length ? formats : DEFAULT_STAMP_FORMATS);
  return rows;
}

export async function ensureStampFormatsReady() {
  if (ready) return;
  await ensureStampFormatsSeeded();
  await syncStampFormatsToRuntime();
  ready = true;
}

export async function listStampFormats() {
  await ensureStampFormatsSeeded();
  return prisma.stampFormatPrice.findMany({
    orderBy: [{ sortOrder: 'asc' }, { excelId: 'asc' }],
  });
}

export async function patchStampFormat(id: string, data: Record<string, unknown>) {
  const row = await prisma.stampFormatPrice.update({
    where: { id },
    data: data as Parameters<typeof prisma.stampFormatPrice.update>[0]['data'],
  });
  invalidateStampFormatsCache();
  await syncStampFormatsToRuntime();
  return row;
}

export type StampImportReport = {
  read: number;
  created: number;
  updated: number;
  errors: number;
  issues: Array<{ line: number; reason: string }>;
};

export const STAMP_EXCEL_COLUMNS = [
  'ID',
  'ARTICLE',
  'TYPE TAMPON',
  'FORMAT',
  'LARGEUR MM',
  'HAUTEUR MM',
  'RÉFÉRENCE',
  'PRIX VENTE',
  'UNITÉ',
  'FORMAT PERSONNALISÉ AUTORISÉ',
  'VISIBLE POS',
  'STATUT',
  'DÉTAIL',
] as const;

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

function oui(s: string, def = true) {
  if (!s) return def;
  return !/non|false|0|no/i.test(s);
}

export async function importStampFormatsFromExcel(
  rows: Record<string, unknown>[],
): Promise<StampImportReport> {
  const report: StampImportReport = { read: rows.length, created: 0, updated: 0, errors: 0, issues: [] };
  for (let i = 0; i < rows.length; i++) {
    const line = i + 2;
    const raw = rows[i]!;
    try {
      const excelId = pick(raw, 'ID', 'excelId') || padExcelId(i + 1);
      const formatLabel = pick(raw, 'FORMAT', 'FORMAT / DIMENSION', 'formatLabel');
      if (!formatLabel) {
        report.errors++;
        report.issues.push({ line, reason: 'FORMAT manquant' });
        continue;
      }
      const widthMm = num(pick(raw, 'LARGEUR MM', 'widthMm'));
      const heightMm = num(pick(raw, 'HAUTEUR MM', 'heightMm'));
      if (!(widthMm > 0) || !(heightMm > 0)) {
        report.errors++;
        report.issues.push({ line, reason: 'dimensions invalides' });
        continue;
      }
      const unitPrice = num(pick(raw, 'PRIX VENTE', 'unitPrice'));
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        report.errors++;
        report.issues.push({ line, reason: 'PRIX VENTE invalide' });
        continue;
      }
      const statusRaw = pick(raw, 'STATUT', 'status').toLowerCase() || 'publié';
      const status = /archi/i.test(statusRaw)
        ? 'archived'
        : /brouillon|draft/i.test(statusRaw)
          ? 'draft'
          : 'published';
      const data = {
        excelId,
        articleLabel: pick(raw, 'ARTICLE') || 'Tampon',
        stampType: pick(raw, 'TYPE TAMPON', 'stampType') || 'Tampon standard',
        formatLabel,
        widthMm,
        heightMm,
        reference: pick(raw, 'RÉFÉRENCE', 'REFERENCE', 'reference') || null,
        unitPrice,
        unit: pick(raw, 'UNITÉ', 'UNITE', 'unit') || 'pièce',
        allowCustomFormat: oui(pick(raw, 'FORMAT PERSONNALISÉ AUTORISÉ', 'FORMAT PERSONNALISE AUTORISE')),
        visiblePOS: oui(pick(raw, 'VISIBLE POS')),
        status,
        details: pick(raw, 'DÉTAIL', 'DETAIL') || null,
        active: status !== 'archived',
        sortOrder: i + 1,
      };
      const existing = await prisma.stampFormatPrice.findFirst({
        where: { OR: [{ excelId }, { reference: data.reference ?? undefined }, { formatLabel, stampType: data.stampType }] },
      });
      if (existing) {
        await prisma.stampFormatPrice.update({ where: { id: existing.id }, data });
        report.updated++;
      } else {
        await prisma.stampFormatPrice.create({ data });
        report.created++;
      }
    } catch (e) {
      report.errors++;
      report.issues.push({ line, reason: e instanceof Error ? e.message : 'Erreur' });
    }
  }
  invalidateStampFormatsCache();
  await syncStampFormatsToRuntime();
  return report;
}

export function stampFormatToExcelRow(r: {
  excelId?: string | null;
  articleLabel: string;
  stampType: string;
  formatLabel: string;
  widthMm: number;
  heightMm: number;
  reference?: string | null;
  unitPrice: number;
  unit: string;
  allowCustomFormat: boolean;
  visiblePOS: boolean;
  status: string;
  details?: string | null;
}) {
  const statut =
    r.status === 'draft' ? 'brouillon' : r.status === 'archived' ? 'archivé' : 'publié';
  return {
    ID: r.excelId ?? '',
    ARTICLE: r.articleLabel,
    'TYPE TAMPON': r.stampType,
    FORMAT: r.formatLabel,
    'LARGEUR MM': r.widthMm,
    'HAUTEUR MM': r.heightMm,
    RÉFÉRENCE: r.reference ?? '',
    'PRIX VENTE': r.unitPrice,
    UNITÉ: r.unit,
    'FORMAT PERSONNALISÉ AUTORISÉ': r.allowCustomFormat ? 'oui' : 'non',
    'VISIBLE POS': r.visiblePOS ? 'oui' : 'non',
    STATUT: statut,
    DÉTAIL: r.details ?? '',
  };
}
