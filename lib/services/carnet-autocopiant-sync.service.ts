/**
 * Seed / sync paramètres Carnet autocopiant + finitions liées.
 */
import { prisma } from '@/lib/prisma';
import { DEFAULT_CARNET_AUTOCOPIANT_PARAMS } from '@/lib/pricing/carnet-autocopiant-params';
import { setCarnetAutocopiantRuntimeParams } from '@/lib/pricing/carnet-autocopiant-pricing';
import { ensureImpressionSfRuntimeReady } from '@/lib/services/pricing-rules-sync.service';

let ready = false;

export function invalidateCarnetAutocopiantCache() {
  ready = false;
}

async function ensureFinishingRows() {
  const rows = [
    {
      excelId: 'FIN-CARNET-NUM',
      name: 'Numérotation carnet autocopiant',
      category: 'Numérotation',
      unit: 'page',
      unitPrice: DEFAULT_CARNET_AUTOCOPIANT_PARAMS.numerotationArPerPage,
      details: '50 Ar / feuillet numéroté — lié Carnet autocopiant',
    },
    {
      excelId: 'FIN-CARNET-REL',
      name: 'Reliure carnet autocopiant',
      category: 'Reliure',
      unit: 'carnet',
      unitPrice: DEFAULT_CARNET_AUTOCOPIANT_PARAMS.reliureAr,
      details: 'Reliure obligatoire carnet / facturier',
    },
    {
      excelId: 'FIN-CARNET-PERF',
      name: 'Perforation carnet',
      category: 'Perforation',
      unit: 'A4',
      unitPrice: DEFAULT_CARNET_AUTOCOPIANT_PARAMS.perforationArPerA4,
      details: '50 Ar / A4 × feuillets équivalent A4',
    },
  ];
  for (const r of rows) {
    const existing = await prisma.finishingPrice.findFirst({
      where: { OR: [{ excelId: r.excelId }, { name: r.name }] },
    });
    if (!existing) {
      await prisma.finishingPrice.create({
        data: {
          ...r,
          formulaType: 'fixed',
          active: true,
          visiblePOS: true,
          status: 'published',
        },
      });
    }
  }
}

export async function ensureCarnetAutocopiantParamsSeeded() {
  await ensureFinishingRows();
  const count = await prisma.carnetAutocopiantParam.count();
  if (count === 0) {
    // Sync prix finitions si déjà en DB
    const num = await prisma.finishingPrice.findFirst({
      where: { name: { contains: 'Numérotation carnet' }, active: true },
    });
    const rel = await prisma.finishingPrice.findFirst({
      where: { name: { contains: 'Reliure carnet' }, active: true },
    });
    const perf = await prisma.finishingPrice.findFirst({
      where: { name: { contains: 'Perforation carnet' }, active: true },
    });
    await prisma.carnetAutocopiantParam.create({
      data: {
        excelId: 'CARNET-001',
        code: DEFAULT_CARNET_AUTOCOPIANT_PARAMS.code,
        label: DEFAULT_CARNET_AUTOCOPIANT_PARAMS.label,
        prixA4Nb: DEFAULT_CARNET_AUTOCOPIANT_PARAMS.prixA4Nb,
        prixA4Quadri: DEFAULT_CARNET_AUTOCOPIANT_PARAMS.prixA4Quadri,
        numerotationArPerPage: num?.unitPrice ?? DEFAULT_CARNET_AUTOCOPIANT_PARAMS.numerotationArPerPage,
        reliureAr: rel?.unitPrice ?? DEFAULT_CARNET_AUTOCOPIANT_PARAMS.reliureAr,
        perforationArPerA4: perf?.unitPrice ?? DEFAULT_CARNET_AUTOCOPIANT_PARAMS.perforationArPerA4,
        couverture300gA3RectoAr: DEFAULT_CARNET_AUTOCOPIANT_PARAMS.couverture300gA3RectoAr,
        wastePct: DEFAULT_CARNET_AUTOCOPIANT_PARAMS.wastePct,
        active: true,
        visiblePOS: true,
        details: DEFAULT_CARNET_AUTOCOPIANT_PARAMS.details,
      },
    });
  }
}

export async function syncCarnetAutocopiantParamsToRuntime() {
  const row = await prisma.carnetAutocopiantParam.findFirst({
    where: { active: true },
    orderBy: { updatedAt: 'desc' },
  });
  setCarnetAutocopiantRuntimeParams(row ?? DEFAULT_CARNET_AUTOCOPIANT_PARAMS);
  return row;
}

export async function ensureCarnetAutocopiantParamsReady() {
  if (ready) return;
  await ensureImpressionSfRuntimeReady();
  await ensureCarnetAutocopiantParamsSeeded();
  await syncCarnetAutocopiantParamsToRuntime();
  ready = true;
}

export async function listCarnetAutocopiantParams() {
  await ensureCarnetAutocopiantParamsSeeded();
  return prisma.carnetAutocopiantParam.findMany({ orderBy: { code: 'asc' } });
}

export async function patchCarnetAutocopiantParam(id: string, data: Record<string, unknown>) {
  const row = await prisma.carnetAutocopiantParam.update({
    where: { id },
    data: data as Parameters<typeof prisma.carnetAutocopiantParam.update>[0]['data'],
  });
  // Miroir vers FinishingPrice si montants finitions changent
  if (data.numerotationArPerPage != null) {
    await prisma.finishingPrice.updateMany({
      where: { name: { contains: 'Numérotation carnet' } },
      data: { unitPrice: Number(data.numerotationArPerPage) },
    });
  }
  if (data.reliureAr != null) {
    await prisma.finishingPrice.updateMany({
      where: { name: { contains: 'Reliure carnet' } },
      data: { unitPrice: Number(data.reliureAr) },
    });
  }
  if (data.perforationArPerA4 != null) {
    await prisma.finishingPrice.updateMany({
      where: { name: { contains: 'Perforation carnet' } },
      data: { unitPrice: Number(data.perforationArPerA4) },
    });
  }
  invalidateCarnetAutocopiantCache();
  await syncCarnetAutocopiantParamsToRuntime();
  return row;
}

export type CarnetImportReport = {
  read: number;
  created: number;
  updated: number;
  errors: number;
  issues: Array<{ line: number; reason: string }>;
};

export async function importCarnetParamsFromExcel(rows: Record<string, unknown>[]): Promise<CarnetImportReport> {
  const report: CarnetImportReport = { read: rows.length, created: 0, updated: 0, errors: 0, issues: [] };
  for (let i = 0; i < rows.length; i++) {
    const line = i + 2;
    const raw = rows[i]!;
    const pick = (...keys: string[]) => {
      for (const k of keys) {
        const v = raw[k] ?? raw[k.toUpperCase()];
        if (v != null && String(v).trim() !== '') return String(v).trim();
      }
      return '';
    };
    const num = (s: string) => {
      const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
      return Number.isFinite(n) ? n : NaN;
    };
    try {
      const code = pick('ID', 'CODE', 'code') || 'default';
      const data = {
        code,
        label: pick('ARTICLE', 'LABEL') || 'Carnet autocopiant / Facturier',
        prixA4Nb: num(pick('PRIX A4 N&B', 'PRIX BASE FORMAT NB', 'prixA4Nb')) || DEFAULT_CARNET_AUTOCOPIANT_PARAMS.prixA4Nb,
        prixA4Quadri: num(pick('PRIX A4 QUADRI', 'PRIX BASE FORMAT QUADRI', 'prixA4Quadri')) || DEFAULT_CARNET_AUTOCOPIANT_PARAMS.prixA4Quadri,
        numerotationArPerPage: num(pick('NUMÉROTATION AR/PAGE', 'NUMEROTATION')) || 50,
        reliureAr: num(pick('RELIURE AR', 'RELIURE')) || 2000,
        perforationArPerA4: num(pick('PERFORATION AR/A4', 'PERFORATION')) || 50,
        couverture300gA3RectoAr: num(pick('COUVERTURE 300G A3 RECTO', 'COUVERTURE')) || 0,
        wastePct: num(pick('PERTE DÉCHET %', 'PERTE DECHET', 'wastePct')) || 5,
        active: !/non|false|0/i.test(pick('ACTIF') || 'oui'),
        visiblePOS: !/non|false|0/i.test(pick('VISIBLE POS') || 'oui'),
        details: pick('DÉTAIL', 'DETAIL') || null,
      };
      const existing = await prisma.carnetAutocopiantParam.findFirst({
        where: { OR: [{ code }, { excelId: code }] },
      });
      if (existing) {
        await prisma.carnetAutocopiantParam.update({ where: { id: existing.id }, data });
        report.updated++;
      } else {
        await prisma.carnetAutocopiantParam.create({ data: { ...data, excelId: code } });
        report.created++;
      }
    } catch (e) {
      report.errors++;
      report.issues.push({ line, reason: e instanceof Error ? e.message : 'Erreur' });
    }
  }
  invalidateCarnetAutocopiantCache();
  await syncCarnetAutocopiantParamsToRuntime();
  return report;
}

export function carnetParamToExcelRow(r: {
  excelId?: string | null;
  code: string;
  label: string;
  prixA4Nb: number;
  prixA4Quadri: number;
  numerotationArPerPage: number;
  reliureAr: number;
  perforationArPerA4: number;
  couverture300gA3RectoAr: number;
  wastePct: number;
  active: boolean;
  visiblePOS: boolean;
  details?: string | null;
}) {
  return {
    ID: r.excelId ?? r.code,
    ARTICLE: r.label,
    'PRIX A4 N&B': r.prixA4Nb,
    'PRIX A4 QUADRI': r.prixA4Quadri,
    'NUMÉROTATION AR/PAGE': r.numerotationArPerPage,
    'RELIURE AR': r.reliureAr,
    'PERFORATION AR/A4': r.perforationArPerA4,
    'COUVERTURE 300G A3 RECTO': r.couverture300gA3RectoAr,
    'PERTE DÉCHET %': r.wastePct,
    ACTIF: r.active ? 'oui' : 'non',
    'VISIBLE POS': r.visiblePOS ? 'oui' : 'non',
    DÉTAIL: r.details ?? '',
  };
}

export const CARNET_EXCEL_COLUMNS = [
  'ID', 'ARTICLE', 'PRIX A4 N&B', 'PRIX A4 QUADRI', 'NUMÉROTATION AR/PAGE',
  'RELIURE AR', 'PERFORATION AR/A4', 'COUVERTURE 300G A3 RECTO', 'PERTE DÉCHET %',
  'ACTIF', 'VISIBLE POS', 'DÉTAIL',
] as const;
