/**
 * Seed / sync équivalences formats Photo → runtime + Excel Admin.
 */
import { prisma } from '@/lib/prisma';
import {
  DEFAULT_PHOTO_FORMAT_EQUIVALENCES,
  setPhotoFormatEquivalencesRuntime,
  type PhotoFormatEquivalenceLike,
} from '@/lib/pricing/photo-format-equivalences';

let ready = false;

export function invalidatePhotoFormatEquivalencesCache() {
  ready = false;
}

export const PHOTO_FORMAT_EXCEL_COLUMNS = [
  'ID',
  'FORMAT AFFICHÉ',
  'LARGEUR MM',
  'HAUTEUR MM',
  'FORMAT FACTURATION',
  'LARGEUR FACTURATION MM',
  'HAUTEUR FACTURATION MM',
  'CATÉGORIE',
  'ACTIF',
  'VISIBLE POS',
  'DÉTAIL',
] as const;

export async function ensurePhotoFormatEquivalencesSeeded() {
  const count = await prisma.photoFormatEquivalence.count();
  if (count > 0) return;
  await prisma.photoFormatEquivalence.createMany({
    data: DEFAULT_PHOTO_FORMAT_EQUIVALENCES.map((r, i) => ({
      excelId: r.excelId ?? String(i + 1).padStart(3, '0'),
      displayLabel: r.displayLabel,
      widthMm: r.widthMm,
      heightMm: r.heightMm,
      billingFormat: r.billingFormat,
      billingWidthMm: r.billingWidthMm,
      billingHeightMm: r.billingHeightMm,
      category: r.category,
      isAlias: r.isAlias ?? false,
      active: r.active !== false,
      visiblePOS: r.visiblePos !== false,
      details: r.details ?? null,
      sortOrder: i,
    })),
  });
}

export async function syncPhotoFormatEquivalencesToRuntime() {
  const rows = await prisma.photoFormatEquivalence.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
  });
  const mapped: PhotoFormatEquivalenceLike[] = rows.length
    ? rows.map((r) => ({
        excelId: r.excelId,
        displayLabel: r.displayLabel,
        widthMm: r.widthMm,
        heightMm: r.heightMm,
        billingFormat: r.billingFormat,
        billingWidthMm: r.billingWidthMm,
        billingHeightMm: r.billingHeightMm,
        category: r.category,
        isAlias: r.isAlias,
        active: r.active,
        visiblePos: r.visiblePOS,
        details: r.details,
      }))
    : DEFAULT_PHOTO_FORMAT_EQUIVALENCES;
  setPhotoFormatEquivalencesRuntime(mapped);
  return mapped;
}

export async function ensurePhotoFormatEquivalencesReady() {
  if (ready) return;
  try {
    await ensurePhotoFormatEquivalencesSeeded();
    await syncPhotoFormatEquivalencesToRuntime();
  } catch {
    setPhotoFormatEquivalencesRuntime(DEFAULT_PHOTO_FORMAT_EQUIVALENCES);
  }
  ready = true;
}

export async function listPhotoFormatEquivalences() {
  await ensurePhotoFormatEquivalencesSeeded();
  return prisma.photoFormatEquivalence.findMany({ orderBy: { sortOrder: 'asc' } });
}

export async function patchPhotoFormatEquivalence(id: string, data: Record<string, unknown>) {
  const row = await prisma.photoFormatEquivalence.update({
    where: { id },
    data: data as Parameters<typeof prisma.photoFormatEquivalence.update>[0]['data'],
  });
  invalidatePhotoFormatEquivalencesCache();
  await syncPhotoFormatEquivalencesToRuntime();
  return row;
}

export function photoFormatEquivalenceToExcelRow(r: {
  excelId?: string | null;
  displayLabel: string;
  widthMm: number;
  heightMm: number;
  billingFormat: string;
  billingWidthMm: number;
  billingHeightMm: number;
  category: string;
  active: boolean;
  visiblePOS: boolean;
  details?: string | null;
  isAlias?: boolean;
}) {
  return {
    ID: r.excelId ?? '',
    'FORMAT AFFICHÉ': r.displayLabel,
    'LARGEUR MM': r.widthMm,
    'HAUTEUR MM': r.heightMm,
    'FORMAT FACTURATION': r.billingFormat,
    'LARGEUR FACTURATION MM': r.billingWidthMm,
    'HAUTEUR FACTURATION MM': r.billingHeightMm,
    CATÉGORIE: r.category,
    ACTIF: r.active ? 'oui' : 'non',
    'VISIBLE POS': r.visiblePOS ? 'oui' : 'non',
    DÉTAIL: r.details ?? (r.isAlias ? 'alias commercial' : ''),
  };
}

export type PhotoFormatImportReport = {
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

function boolOui(s: string, fallback = true) {
  if (!s) return fallback;
  return !/non|false|0/i.test(s);
}

export async function importPhotoFormatEquivalencesFromExcel(
  rows: Record<string, unknown>[],
): Promise<PhotoFormatImportReport> {
  const report: PhotoFormatImportReport = {
    read: rows.length,
    created: 0,
    updated: 0,
    errors: 0,
    issues: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const line = i + 2;
    const raw = rows[i]!;
    try {
      const displayLabel = pick(raw, 'FORMAT AFFICHÉ', 'FORMAT AFFICHE', 'displayLabel');
      const billingFormat = pick(raw, 'FORMAT FACTURATION', 'billingFormat');
      if (!displayLabel || !billingFormat) {
        report.errors++;
        report.issues.push({ line, reason: 'FORMAT AFFICHÉ et FORMAT FACTURATION requis' });
        continue;
      }
      const widthMm = num(pick(raw, 'LARGEUR MM', 'widthMm'));
      const heightMm = num(pick(raw, 'HAUTEUR MM', 'heightMm'));
      const billingWidthMm = num(pick(raw, 'LARGEUR FACTURATION MM', 'billingWidthMm')) || widthMm;
      const billingHeightMm = num(pick(raw, 'HAUTEUR FACTURATION MM', 'billingHeightMm')) || heightMm;
      if (!(widthMm > 0) || !(heightMm > 0)) {
        report.errors++;
        report.issues.push({ line, reason: 'Dimensions invalides' });
        continue;
      }
      const excelId = pick(raw, 'ID') || String(i + 1).padStart(3, '0');
      const data = {
        excelId,
        displayLabel,
        widthMm,
        heightMm,
        billingFormat,
        billingWidthMm,
        billingHeightMm,
        category: pick(raw, 'CATÉGORIE', 'category') || 'photo',
        active: boolOui(pick(raw, 'ACTIF')),
        visiblePOS: boolOui(pick(raw, 'VISIBLE POS')),
        details: pick(raw, 'DÉTAIL', 'DETAIL') || null,
        isAlias: /alias/i.test(pick(raw, 'CATÉGORIE', 'DÉTAIL', 'DETAIL')),
        sortOrder: i,
      };

      const existing = await prisma.photoFormatEquivalence.findFirst({
        where: { OR: [{ excelId }, { displayLabel }] },
      });
      if (existing) {
        await prisma.photoFormatEquivalence.update({ where: { id: existing.id }, data });
        report.updated++;
      } else {
        await prisma.photoFormatEquivalence.create({ data });
        report.created++;
      }
    } catch (e) {
      report.errors++;
      report.issues.push({ line, reason: e instanceof Error ? e.message : 'Erreur' });
    }
  }

  invalidatePhotoFormatEquivalencesCache();
  await syncPhotoFormatEquivalencesToRuntime();
  return report;
}
