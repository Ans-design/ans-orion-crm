/**
 * Seed / sync cadres vierges + règles Cadre photo.
 */
import { prisma } from '@/lib/prisma';
import { DEFAULT_BLANK_FRAMES, type BlankFrameLike } from '@/lib/pricing/blank-frame-rules';
import {
  DEFAULT_CADRE_PHOTO_RULE,
  setBlankFramesRuntime,
  setCadrePhotoRuleRuntime,
} from '@/lib/pricing/cadre-photo-pricing';
import { ensureTiragePhotoParamsReady } from '@/lib/services/tirage-photo-sync.service';

let ready = false;

export function invalidateCadrePhotoCache() {
  ready = false;
}

function padExcelId(n: number): string {
  return String(n).padStart(3, '0');
}

export async function ensureBlankFramesSeeded() {
  const count = await prisma.blankFramePrice.count();
  if (count > 0) return;
  let i = 0;
  for (const f of DEFAULT_BLANK_FRAMES) {
    i += 1;
    await prisma.blankFramePrice.create({
      data: {
        excelId: padExcelId(i),
        articleLabel: 'Cadre vierge',
        frameType: f.frameType,
        formatLabel: f.formatLabel,
        widthMm: f.widthMm,
        heightMm: f.heightMm,
        material: f.material ?? null,
        color: f.color ?? null,
        unitPrice: f.unitPrice,
        unit: 'pièce',
        visiblePOS: true,
        status: 'published',
        sortOrder: i,
        active: true,
      },
    });
  }
}

export async function ensureCadrePhotoRuleSeeded() {
  const count = await prisma.cadrePhotoRuleParam.count();
  if (count > 0) return;
  await prisma.cadrePhotoRuleParam.create({
    data: {
      excelId: '001',
      code: 'default',
      label: 'Cadre photo',
      usesTiragePhoto: true,
      optionalSupplement: 0,
      active: true,
      visiblePOS: true,
      details: 'Prix = cadre vierge + tirage photo (moteur Tirage photo). Type papier sans impact.',
    },
  });
}

export async function syncCadrePhotoToRuntime() {
  const rows = await prisma.blankFramePrice.findMany({
    where: { active: true, status: 'published', visiblePOS: true },
    orderBy: [{ sortOrder: 'asc' }, { frameType: 'asc' }],
  });
  const frames: BlankFrameLike[] = rows.map((r) => ({
    id: r.id,
    frameType: r.frameType,
    formatLabel: r.formatLabel,
    widthMm: r.widthMm,
    heightMm: r.heightMm,
    material: r.material,
    color: r.color,
    unitPrice: r.unitPrice,
    active: r.active,
    status: r.status,
  }));
  setBlankFramesRuntime(frames.length ? frames : DEFAULT_BLANK_FRAMES);

  const rule = await prisma.cadrePhotoRuleParam.findFirst({
    where: { active: true },
    orderBy: { updatedAt: 'desc' },
  });
  setCadrePhotoRuleRuntime(
    rule
      ? { usesTiragePhoto: rule.usesTiragePhoto, optionalSupplement: rule.optionalSupplement }
      : DEFAULT_CADRE_PHOTO_RULE,
  );
  return { frames: rows, rule };
}

export async function ensureCadrePhotoReady() {
  if (ready) return;
  await ensureTiragePhotoParamsReady();
  await ensureBlankFramesSeeded();
  await ensureCadrePhotoRuleSeeded();
  await syncCadrePhotoToRuntime();
  ready = true;
}

export async function listBlankFrames() {
  await ensureBlankFramesSeeded();
  return prisma.blankFramePrice.findMany({
    orderBy: [{ sortOrder: 'asc' }, { frameType: 'asc' }, { formatLabel: 'asc' }],
  });
}

export async function listCadrePhotoRules() {
  await ensureCadrePhotoRuleSeeded();
  return prisma.cadrePhotoRuleParam.findMany({ orderBy: { code: 'asc' } });
}

export async function patchBlankFrame(id: string, data: Record<string, unknown>) {
  const row = await prisma.blankFramePrice.update({
    where: { id },
    data: data as Parameters<typeof prisma.blankFramePrice.update>[0]['data'],
  });
  invalidateCadrePhotoCache();
  await syncCadrePhotoToRuntime();
  return row;
}

export async function patchCadrePhotoRule(id: string, data: Record<string, unknown>) {
  const row = await prisma.cadrePhotoRuleParam.update({
    where: { id },
    data: data as Parameters<typeof prisma.cadrePhotoRuleParam.update>[0]['data'],
  });
  invalidateCadrePhotoCache();
  await syncCadrePhotoToRuntime();
  return row;
}

export const CADRES_VIERGES_COLUMNS = [
  'ID', 'ARTICLE', 'TYPE CADRE', 'FORMAT CADRE', 'LARGEUR MM', 'HAUTEUR MM',
  'MATIÈRE CADRE', 'COULEUR CADRE', 'PRIX CADRE VIERGE', 'UNITÉ',
  'VISIBLE POS', 'STATUT', 'DÉTAIL',
] as const;

export const CADRE_PHOTO_REGLES_COLUMNS = [
  'ID', 'ARTICLE', 'FORMAT CADRE', 'FORMAT TIRAGE PHOTO LIÉ',
  'UTILISE PRIX TIRAGE PHOTO', 'SUPPLÉMENT OPTIONNEL', 'PALIER REMISE',
  'VISIBLE POS', 'ACTIF', 'DÉTAIL',
] as const;

export type CadreImportReport = {
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

function oui(s: string, def = true) {
  if (!s) return def;
  return !/non|false|0|no/i.test(s);
}

export async function importBlankFramesFromExcel(
  rows: Record<string, unknown>[],
): Promise<CadreImportReport> {
  const report: CadreImportReport = { read: rows.length, created: 0, updated: 0, errors: 0, issues: [] };
  for (let i = 0; i < rows.length; i++) {
    const line = i + 2;
    const raw = rows[i]!;
    try {
      const excelId = pick(raw, 'ID', 'excelId') || padExcelId(i + 1);
      const frameType = pick(raw, 'TYPE CADRE', 'frameType');
      const formatLabel = pick(raw, 'FORMAT CADRE', 'formatLabel');
      if (!frameType || !formatLabel) {
        report.errors++;
        report.issues.push({ line, reason: 'TYPE/FORMAT manquant' });
        continue;
      }
      const widthMm = num(pick(raw, 'LARGEUR MM', 'widthMm'));
      const heightMm = num(pick(raw, 'HAUTEUR MM', 'heightMm'));
      const unitPrice = num(pick(raw, 'PRIX CADRE VIERGE', 'unitPrice'));
      if (!(widthMm > 0) || !(heightMm > 0) || !Number.isFinite(unitPrice) || unitPrice < 0) {
        report.errors++;
        report.issues.push({ line, reason: 'dimensions/prix invalides' });
        continue;
      }
      const statusRaw = pick(raw, 'STATUT').toLowerCase() || 'publié';
      const status = /archi/i.test(statusRaw)
        ? 'archived'
        : /brouillon|draft/i.test(statusRaw)
          ? 'draft'
          : 'published';
      const data = {
        excelId,
        articleLabel: pick(raw, 'ARTICLE') || 'Cadre vierge',
        frameType,
        formatLabel,
        widthMm,
        heightMm,
        material: pick(raw, 'MATIÈRE CADRE', 'MATIERE CADRE') || null,
        color: pick(raw, 'COULEUR CADRE') || null,
        unitPrice,
        unit: pick(raw, 'UNITÉ', 'UNITE') || 'pièce',
        visiblePOS: oui(pick(raw, 'VISIBLE POS')),
        status,
        details: pick(raw, 'DÉTAIL', 'DETAIL') || null,
        active: status !== 'archived',
        sortOrder: i + 1,
      };
      const existing = await prisma.blankFramePrice.findFirst({
        where: {
          OR: [
            { excelId },
            { frameType, formatLabel },
          ],
        },
      });
      if (existing) {
        await prisma.blankFramePrice.update({ where: { id: existing.id }, data });
        report.updated++;
      } else {
        await prisma.blankFramePrice.create({ data });
        report.created++;
      }
    } catch (e) {
      report.errors++;
      report.issues.push({ line, reason: e instanceof Error ? e.message : 'Erreur' });
    }
  }
  invalidateCadrePhotoCache();
  await syncCadrePhotoToRuntime();
  return report;
}

export async function importCadreRulesFromExcel(
  rows: Record<string, unknown>[],
): Promise<CadreImportReport> {
  const report: CadreImportReport = { read: rows.length, created: 0, updated: 0, errors: 0, issues: [] };
  for (let i = 0; i < rows.length; i++) {
    const line = i + 2;
    const raw = rows[i]!;
    try {
      const excelId = pick(raw, 'ID') || '001';
      const data = {
        excelId,
        code: 'default',
        label: pick(raw, 'ARTICLE') || 'Cadre photo',
        usesTiragePhoto: oui(pick(raw, 'UTILISE PRIX TIRAGE PHOTO'), true),
        optionalSupplement: num(pick(raw, 'SUPPLÉMENT OPTIONNEL')) || 0,
        visiblePOS: oui(pick(raw, 'VISIBLE POS')),
        active: oui(pick(raw, 'ACTIF')),
        details: pick(raw, 'DÉTAIL', 'DETAIL') || null,
      };
      const existing = await prisma.cadrePhotoRuleParam.findFirst({
        where: { OR: [{ code: 'default' }, { excelId }] },
      });
      if (existing) {
        await prisma.cadrePhotoRuleParam.update({ where: { id: existing.id }, data });
        report.updated++;
      } else {
        await prisma.cadrePhotoRuleParam.create({ data });
        report.created++;
      }
    } catch (e) {
      report.errors++;
      report.issues.push({ line, reason: e instanceof Error ? e.message : 'Erreur' });
    }
  }
  invalidateCadrePhotoCache();
  await syncCadrePhotoToRuntime();
  return report;
}

export function blankFrameToExcelRow(r: {
  excelId?: string | null;
  articleLabel: string;
  frameType: string;
  formatLabel: string;
  widthMm: number;
  heightMm: number;
  material?: string | null;
  color?: string | null;
  unitPrice: number;
  unit: string;
  visiblePOS: boolean;
  status: string;
  details?: string | null;
}) {
  const statut =
    r.status === 'draft' ? 'brouillon' : r.status === 'archived' ? 'archivé' : 'publié';
  return {
    ID: r.excelId ?? '',
    ARTICLE: r.articleLabel,
    'TYPE CADRE': r.frameType,
    'FORMAT CADRE': r.formatLabel,
    'LARGEUR MM': r.widthMm,
    'HAUTEUR MM': r.heightMm,
    'MATIÈRE CADRE': r.material ?? '',
    'COULEUR CADRE': r.color ?? '',
    'PRIX CADRE VIERGE': r.unitPrice,
    UNITÉ: r.unit,
    'VISIBLE POS': r.visiblePOS ? 'oui' : 'non',
    STATUT: statut,
    DÉTAIL: r.details ?? '',
  };
}

export function cadreRuleToExcelRows(r: {
  excelId?: string | null;
  label: string;
  usesTiragePhoto: boolean;
  optionalSupplement: number;
  visiblePOS: boolean;
  active: boolean;
  details?: string | null;
}) {
  const formats = ['10×15 cm', 'A6', 'A5', 'A4', 'A3', 'A3+'];
  return formats.map((fmt, i) => ({
    ID: String(i + 1).padStart(3, '0'),
    ARTICLE: r.label,
    'FORMAT CADRE': fmt,
    'FORMAT TIRAGE PHOTO LIÉ': fmt,
    'UTILISE PRIX TIRAGE PHOTO': r.usesTiragePhoto ? 'oui' : 'non',
    'SUPPLÉMENT OPTIONNEL': r.optionalSupplement,
    'PALIER REMISE': 'selon Admin Paliers',
    'VISIBLE POS': r.visiblePOS ? 'oui' : 'non',
    ACTIF: r.active ? 'oui' : 'non',
    DÉTAIL: r.details ?? '',
  }));
}
