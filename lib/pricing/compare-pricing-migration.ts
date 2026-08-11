import { calculatePrice } from '@/lib/pricing/calculate';
import { loadDraftDynamicContext } from '@/lib/pricing/dynamic-pricing-context';
import { tryComputeDynamicPrice } from '@/lib/pricing/dynamic-engine';
import { resolveMigrationPilotConfig } from '@/lib/pricing/migration-pilot-configs';

export const MIGRATION_TOLERANCE_PERCENT = 5;
export const MIGRATION_TOLERANCE_FORMULA_PERCENT = 15;

const DEDICATED_LEGACY_SOURCES = new Set([
  'livresTarif',
  'calendarTarif',
  'plvTarif',
  'blocNoteTarif',
  'impressionSfTarif',
  'bacheEngine',
  'gfLaizeSurface',
  'gfSurfaceA0',
]);

export interface PricingMigrationCompareRow {
  articleId: string;
  qty: number;
  legacyUnit: number | null;
  legacyTotal: number | null;
  legacySource: string | null;
  dynamicUnit: number | null;
  dynamicTotal: number | null;
  dynamicSource: string | null;
  deltaUnit: number | null;
  deltaPercent: number | null;
  hasProfile: boolean;
  isPublished: boolean;
  migrationReady: boolean;
  migrationReason: string;
  tolerancePercent: number;
}

export function migrationTolerancePercent(
  legacySource: string | null,
  dynamicSource: string | null,
): number {
  if (legacySource && DEDICATED_LEGACY_SOURCES.has(legacySource)) return MIGRATION_TOLERANCE_FORMULA_PERCENT;
  if (dynamicSource?.startsWith('dynamicGf') || dynamicSource === 'dynamicBacheEngine') {
    return MIGRATION_TOLERANCE_FORMULA_PERCENT;
  }
  return MIGRATION_TOLERANCE_PERCENT;
}

export function assessMigrationReadiness(row: Omit<PricingMigrationCompareRow, 'migrationReady' | 'migrationReason' | 'tolerancePercent'>): {
  ready: boolean;
  reason: string;
  tolerancePercent: number;
} {
  const tolerancePercent = migrationTolerancePercent(row.legacySource, row.dynamicSource);

  if (!row.hasProfile) {
    return { ready: false, reason: 'Profil manquant — sync catalogue', tolerancePercent };
  }
  if (row.isPublished) {
    return { ready: false, reason: 'Déjà publié sur le moteur dynamique', tolerancePercent };
  }
  if (row.legacyUnit == null || row.legacyUnit <= 0) {
    return { ready: false, reason: 'Legacy non calculable (sur devis ou config incomplète)', tolerancePercent };
  }
  if (row.dynamicUnit == null || row.dynamicUnit <= 0) {
    return { ready: false, reason: 'Moteur draft non calculable — importer PRIX 2026', tolerancePercent };
  }

  const pct = Math.abs(row.deltaPercent ?? 999);
  if (pct <= tolerancePercent) {
    return { ready: true, reason: `Écart ≤ ${tolerancePercent}%`, tolerancePercent };
  }

  return {
    ready: false,
    reason: `Écart ${row.deltaPercent}% > tolérance ${tolerancePercent}%`,
    tolerancePercent,
  };
}

export async function compareArticlePricingMigration(
  articleId: string,
  config: Record<string, unknown> = {},
  qty = 100,
): Promise<PricingMigrationCompareRow> {
  const merged = { ...config, qty: config.qty ?? qty };
  const legacy = await calculatePrice(articleId, merged, { skipDynamic: true });
  const draftCtx = await loadDraftDynamicContext(articleId);
  const dynamic = draftCtx ? await tryComputeDynamicPrice(articleId, merged, undefined, draftCtx) : null;

  const legacyUnit = legacy?.prixUnitaire ?? null;
  const dynamicUnit = dynamic?.prixUnitaire ?? null;
  const deltaUnit =
    legacyUnit != null && dynamicUnit != null ? Math.round(dynamicUnit - legacyUnit) : null;
  const deltaPercent =
    legacyUnit != null && dynamicUnit != null && legacyUnit > 0
      ? Math.round(((dynamicUnit - legacyUnit) / legacyUnit) * 1000) / 10
      : null;

  const base = {
    articleId,
    qty: Number(merged.qty) || qty,
    legacyUnit,
    legacyTotal: legacy?.totalHT ?? null,
    legacySource: (legacy?.snapshot as Record<string, unknown>)?.priceSource as string | null ?? null,
    dynamicUnit,
    dynamicTotal: dynamic?.totalHT ?? null,
    dynamicSource: (dynamic?.snapshot as Record<string, unknown>)?.priceSource as string | null ?? null,
    deltaUnit,
    deltaPercent,
    hasProfile: Boolean(draftCtx),
    isPublished: draftCtx?.profile.status === 'published',
  };

  const assessment = assessMigrationReadiness(base);

  return {
    ...base,
    migrationReady: assessment.ready,
    migrationReason: assessment.reason,
    tolerancePercent: assessment.tolerancePercent,
  };
}

export const MIGRATION_PILOT_ARTICLES = [
  'pkg-hangtag',
  'pkg-boite',
  'gf-bache',
  'tx-tshirt',
  'imp-impression',
  'plv-rollup',
  'bk-livres',
  'cal-plateau',
  'fly-a4',
  'cv-std',
] as const;

export async function compareMigrationPilotBatch(qty?: number) {
  const rows: PricingMigrationCompareRow[] = [];
  for (const articleId of MIGRATION_PILOT_ARTICLES) {
    const config = resolveMigrationPilotConfig(articleId);
    const effectiveQty = Number(config.qty ?? qty ?? 100);
    rows.push(await compareArticlePricingMigration(articleId, config, effectiveQty));
  }
  return rows;
}
