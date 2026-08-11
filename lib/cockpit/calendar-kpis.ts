import { prisma } from '@/lib/prisma';
import {
  isCalendarArticleId,
  isForbiddenMarquepageMaterial,
} from '@/lib/calendar/calendar-material-policy';
import { readCalendarSnapshotFromConfig } from '@/lib/calendar/calendar-snapshot';

export type CalendarModuleKpis = {
  lignesDevis: number;
  lignesCommande: number;
  caDevis: number;
  caCommande: number;
  ventesParArticle: Record<string, number>;
  caParArticle: Record<string, number>;
  topFormats: { format: string; count: number }[];
  consommationBruteM2: number;
  consommationReelleM2: number;
  prixForceCount: number;
  sansPrixAutoCount: number;
  offsetInterditCount: number;
  sra3LegacyCount: number;
  feuilletsMoyen: number;
};

type LigneRow = {
  articleId: string | null;
  articleLabel: string;
  quantity: number;
  totalLigne: number;
  configSnapshot: unknown;
  prixUnitaireForce?: number | null;
  pricingMode?: string | null;
};

function asConfig(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function extractFromLigne(row: LigneRow, acc: CalendarModuleKpis) {
  const articleId = row.articleId ?? '';
  if (!isCalendarArticleId(articleId)) return;

  const config = asConfig(row.configSnapshot);
  const snap = readCalendarSnapshotFromConfig(config);
  const format = snap?.formatLabel ?? String(config.format ?? config.dim ?? '—');
  const matiere = snap?.material ?? String(config.matiere ?? '');
  const sheets = snap?.numberOfSheets ?? Number(String(config.feuillets ?? '').match(/\d+/)?.[0] ?? 1);

  acc.ventesParArticle[articleId] = (acc.ventesParArticle[articleId] ?? 0) + row.quantity;
  acc.caParArticle[articleId] = (acc.caParArticle[articleId] ?? 0) + row.totalLigne;

  const fmtKey = format.slice(0, 80);
  const existing = acc.topFormats.find((f) => f.format === fmtKey);
  if (existing) existing.count += row.quantity;
  else acc.topFormats.push({ format: fmtKey, count: row.quantity });

  if (snap) {
    acc.consommationBruteM2 += snap.totalGrossSurfaceM2;
    acc.consommationReelleM2 += snap.totalRealSurfaceM2;
  }

  if (row.pricingMode === 'force_pu' || row.pricingMode === 'force_total' || row.prixUnitaireForce) {
    acc.prixForceCount += 1;
  }
  if (!snap && row.totalLigne <= 0) acc.sansPrixAutoCount += 1;

  if (articleId === 'cal-marquepage' && isForbiddenMarquepageMaterial(matiere)) {
    acc.offsetInterditCount += 1;
  }
  if (/SRA3/i.test(format) && !/A3\+/i.test(format)) {
    acc.sra3LegacyCount += 1;
  }

  if (['cal-chevalet', 'cal-sousmain', 'cal-plateau', 'cal-mural'].includes(articleId)) {
    acc.feuilletsMoyen += sheets;
  }
}

function emptyKpis(): CalendarModuleKpis {
  return {
    lignesDevis: 0,
    lignesCommande: 0,
    caDevis: 0,
    caCommande: 0,
    ventesParArticle: {},
    caParArticle: {},
    topFormats: [],
    consommationBruteM2: 0,
    consommationReelleM2: 0,
    prixForceCount: 0,
    sansPrixAutoCount: 0,
    offsetInterditCount: 0,
    sra3LegacyCount: 0,
    feuilletsMoyen: 0,
  };
}

/** KPI cockpit module Calendrier — données réelles devis + commandes. */
export async function getCalendarModuleKpis(monthsBack = 3): Promise<CalendarModuleKpis> {
  const since = new Date();
  since.setMonth(since.getMonth() - monthsBack);

  const [devisLignes, commandeLignes] = await Promise.all([
    prisma.devisLigne.findMany({
      where: { articleId: { startsWith: 'cal-' }, createdAt: { gte: since } },
      select: {
        articleId: true,
        articleLabel: true,
        quantity: true,
        totalLigne: true,
        configSnapshot: true,
        prixUnitaireForce: true,
        pricingMode: true,
      },
    }),
    prisma.commandeLigne.findMany({
      where: { articleId: { startsWith: 'cal-' }, createdAt: { gte: since } },
      select: {
        articleId: true,
        articleLabel: true,
        quantity: true,
        totalLigne: true,
        configSnapshot: true,
      },
    }),
  ]);

  const acc = emptyKpis();
  acc.lignesDevis = devisLignes.length;
  acc.lignesCommande = commandeLignes.length;
  acc.caDevis = devisLignes.reduce((s, l) => s + l.totalLigne, 0);
  acc.caCommande = commandeLignes.reduce((s, l) => s + l.totalLigne, 0);

  let feuilletLines = 0;
  for (const l of devisLignes) {
    extractFromLigne(l as LigneRow, acc);
    if (l.articleId && ['cal-chevalet', 'cal-sousmain', 'cal-plateau', 'cal-mural'].includes(l.articleId)) {
      feuilletLines += 1;
    }
  }
  for (const l of commandeLignes) {
    extractFromLigne(l as LigneRow, acc);
    if (l.articleId && ['cal-chevalet', 'cal-sousmain', 'cal-plateau', 'cal-mural'].includes(l.articleId)) {
      feuilletLines += 1;
    }
  }

  acc.topFormats.sort((a, b) => b.count - a.count);
  acc.consommationBruteM2 = parseFloat(acc.consommationBruteM2.toFixed(4));
  acc.consommationReelleM2 = parseFloat(acc.consommationReelleM2.toFixed(4));
  acc.feuilletsMoyen = feuilletLines > 0
    ? parseFloat((acc.feuilletsMoyen / feuilletLines).toFixed(1))
    : 0;

  return acc;
}
