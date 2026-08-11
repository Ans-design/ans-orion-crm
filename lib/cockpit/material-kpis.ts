import { prisma } from '@/lib/prisma';
import { readCalendarSnapshotFromConfig } from '@/lib/calendar/calendar-snapshot';
import { readPackagingSnapshotFromConfig } from '@/lib/packaging/packaging-snapshot';
import { readCustomSurfaceSnapshotFromConfig } from '@/lib/pos/surface-snapshot';
import { isCustomFormatChipValue } from '@/lib/pos/generated-format-label';

export type MaterialModuleKpis = {
  lignesDevis: number;
  lignesCommande: number;
  /** CA snapshot lignes — lineage devis/commande séparés (anti double-comptage P0-24). */
  caDevis: number;
  caCommande: number;
  surfaceBruteM2: number;
  surfaceReelleM2: number;
  calendarLignes: number;
  packagingLignes: number;
  customSurfaceLignes: number;
  prixForceCount: number;
  sansSnapshotCount: number;
  topFormats: { format: string; count: number }[];
  /** Ne jamais sommer caDevis+caCommande comme CA unique. */
  lineageNote: 'caDevis and caCommande are mutually exclusive cohorts';
};

type LigneRow = {
  articleId: string | null;
  quantity: number;
  totalLigne: number;
  configSnapshot: unknown;
  prixUnitaireForce?: number | null;
  pricingMode?: string | null;
};

function asConfig(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function extractFromLigne(row: LigneRow, acc: MaterialModuleKpis) {
  const config = asConfig(row.configSnapshot);
  const cal = readCalendarSnapshotFromConfig(config);
  const pkg = readPackagingSnapshotFromConfig(config);
  const surf = readCustomSurfaceSnapshotFromConfig(config);

  if (!cal && !pkg && !surf) {
    const fmt = String(config.format ?? config.dimension ?? '');
    if (isCustomFormatChipValue(fmt) && row.totalLigne <= 0) {
      acc.sansSnapshotCount += 1;
    }
    return;
  }

  let formatLabel = '—';
  if (cal) {
    acc.calendarLignes += 1;
    formatLabel = cal.formatLabel;
    acc.surfaceBruteM2 += cal.totalGrossSurfaceM2;
    acc.surfaceReelleM2 += cal.totalRealSurfaceM2;
  } else if (pkg) {
    acc.packagingLignes += 1;
    formatLabel = pkg.formatDeveloppe;
    acc.surfaceBruteM2 += pkg.surfaceBruteM2 * row.quantity;
  } else if (surf) {
    acc.customSurfaceLignes += 1;
    formatLabel = surf.formatLabel;
    acc.surfaceBruteM2 += surf.totalGrossSurfaceM2;
    acc.surfaceReelleM2 += surf.realSurfaceM2 * row.quantity;
  }

  const fmtKey = formatLabel.slice(0, 80);
  const existing = acc.topFormats.find((f) => f.format === fmtKey);
  if (existing) existing.count += row.quantity;
  else acc.topFormats.push({ format: fmtKey, count: row.quantity });

  if (row.pricingMode === 'force_pu' || row.pricingMode === 'force_total' || row.prixUnitaireForce) {
    acc.prixForceCount += 1;
  }
}

function emptyKpis(): MaterialModuleKpis {
  return {
    lignesDevis: 0,
    lignesCommande: 0,
    caDevis: 0,
    caCommande: 0,
    surfaceBruteM2: 0,
    surfaceReelleM2: 0,
    calendarLignes: 0,
    packagingLignes: 0,
    customSurfaceLignes: 0,
    prixForceCount: 0,
    sansSnapshotCount: 0,
    topFormats: [],
    lineageNote: 'caDevis and caCommande are mutually exclusive cohorts',
  };
}

/** KPI cockpit matière (calendrier + packaging + surfaces L×l) — endpoint dédié. */
export async function getMaterialModuleKpis(monthsBack = 3): Promise<MaterialModuleKpis> {
  const since = new Date();
  since.setMonth(since.getMonth() - monthsBack);

  const [devisLignes, commandeLignes] = await Promise.all([
    prisma.devisLigne.findMany({
      where: { createdAt: { gte: since } },
      select: {
        articleId: true,
        quantity: true,
        totalLigne: true,
        configSnapshot: true,
        prixUnitaireForce: true,
        pricingMode: true,
      },
    }),
    prisma.commandeLigne.findMany({
      where: { createdAt: { gte: since } },
      select: {
        articleId: true,
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

  for (const l of devisLignes) extractFromLigne(l as LigneRow, acc);
  for (const l of commandeLignes) extractFromLigne(l as LigneRow, acc);

  acc.topFormats.sort((a, b) => b.count - a.count);
  acc.surfaceBruteM2 = parseFloat(acc.surfaceBruteM2.toFixed(4));
  acc.surfaceReelleM2 = parseFloat(acc.surfaceReelleM2.toFixed(4));

  return acc;
}
