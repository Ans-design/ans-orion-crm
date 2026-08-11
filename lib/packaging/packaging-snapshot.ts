import type { PackagingSurfaceResult } from '@/lib/data/packaging-surface';
import { resolvePackagingMaterialRecap } from '@/lib/packaging/material-recap';
import type { PackagingBoxPriceResult } from '@/lib/packaging/packaging-box-price';

export const PACKAGING_SNAPSHOT_VERSION = 'pkg-v1';
export const PACKAGING_PRICE_SNAPSHOT_VERSION = 'pkg-v2-price';

export type PackagingCalculationSnapshot = {
  formulaVersion: string;
  articleId: string;
  structure: string;
  formatDeveloppe: string;
  formatBrut: string;
  surfaceMm2: number;
  surfaceCm2: number;
  surfaceM2: number;
  surfaceBruteM2: number;
  margeRule: string;
  quantity: number;
  unitPrice: number;
  materialPrice: number;
  totalPrice: number;
  createdAt: string;
};

/** Snapshot prix v2 — ISF + finitions + marges (pkg-boite) */
export type PackagingBoxPriceSnapshotV2 = {
  formulaVersion: typeof PACKAGING_PRICE_SNAPSHOT_VERSION;
  articleId: string;
  typeBoite: string;
  longueurMm: number;
  profondeurMm: number;
  hauteurMm: number;
  surfaceTheoriqueM2: number;
  surfaceAvecDechetsM2: number;
  margeDechetsPct: number;
  equivA4: number;
  formatEquivalent: string;
  prixA4Impression: number;
  prixImpressionBrut: number;
  prixDechetsMatiere: number;
  prixImpressionAvecDechets: number;
  finitionLines: Array<{ label: string; unit: string; unitPriceA4: number; amount: number }>;
  prixFinitions: number;
  prixFaconnage: number;
  sousTotalDepenses: number;
  beneficePct: number;
  benefice: number;
  margeDepensePct: number;
  margeDepense: number;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  formula: string;
  createdAt: string;
};

export function buildPackagingCalculationSnapshot(
  articleId: string,
  config: Record<string, unknown>,
  opts: { unitPrice: number; qty: number; prixCm2?: number },
): PackagingCalculationSnapshot | null {
  const recap = resolvePackagingMaterialRecap(articleId, config);
  if (!recap) return null;
  return recapToSnapshot(articleId, recap, opts);
}

function recapToSnapshot(
  articleId: string,
  recap: PackagingSurfaceResult,
  opts: { unitPrice: number; qty: number; prixCm2?: number },
): PackagingCalculationSnapshot {
  const materialPrice = opts.prixCm2
    ? Math.round(opts.prixCm2 * recap.surfaceCm2)
    : opts.unitPrice;
  const unitPrice = opts.unitPrice || materialPrice;

  return {
    formulaVersion: PACKAGING_SNAPSHOT_VERSION,
    articleId,
    structure: recap.structure,
    formatDeveloppe: recap.formatDeveloppe,
    formatBrut: recap.formatBrut,
    surfaceMm2: recap.surfaceMm2,
    surfaceCm2: recap.surfaceCm2,
    surfaceM2: recap.surfaceM2,
    surfaceBruteM2: recap.surfaceM2,
    margeRule: recap.margeRule,
    quantity: opts.qty,
    unitPrice,
    materialPrice,
    totalPrice: unitPrice * opts.qty,
    createdAt: new Date().toISOString(),
  };
}

export function buildPackagingBoxPriceSnapshotV2(
  articleId: string,
  _config: Record<string, unknown>,
  price: PackagingBoxPriceResult,
): PackagingBoxPriceSnapshotV2 {
  return {
    formulaVersion: PACKAGING_PRICE_SNAPSHOT_VERSION,
    articleId,
    typeBoite: price.typeBoite,
    longueurMm: price.longueurMm,
    profondeurMm: price.profondeurMm,
    hauteurMm: price.hauteurMm,
    surfaceTheoriqueM2: price.surfaceTheoriqueM2,
    surfaceAvecDechetsM2: price.surfaceAvecDechetsM2,
    margeDechetsPct: price.margeDechetsPct,
    equivA4: price.equivA4,
    formatEquivalent: price.formatEquivalent,
    prixA4Impression: price.prixA4Impression,
    prixImpressionBrut: price.prixImpressionBrut,
    prixDechetsMatiere: price.prixDechetsMatiere,
    prixImpressionAvecDechets: price.prixImpressionAvecDechets,
    finitionLines: price.finitionLines.map((l) => ({ ...l })),
    prixFinitions: price.prixFinitions,
    prixFaconnage: price.prixFaconnage,
    sousTotalDepenses: price.sousTotalDepenses,
    beneficePct: price.beneficePct,
    benefice: price.benefice,
    margeDepensePct: price.margeDepensePct,
    margeDepense: price.margeDepense,
    unitPrice: price.prixUnitaire,
    quantity: price.qty,
    totalPrice: price.prixTotal,
    formula: price.formula,
    createdAt: new Date().toISOString(),
  };
}

export function readPackagingSnapshotFromConfig(
  config: Record<string, unknown>,
): PackagingCalculationSnapshot | null {
  const raw = config._packagingSnapshot;
  if (!raw || typeof raw !== 'object') return null;
  return raw as PackagingCalculationSnapshot;
}

export function readPackagingPriceSnapshotV2FromConfig(
  config: Record<string, unknown>,
): PackagingBoxPriceSnapshotV2 | null {
  const raw = config._packagingSnapshotV2 ?? config._packagingPriceSnapshot;
  if (!raw || typeof raw !== 'object') return null;
  const snap = raw as PackagingBoxPriceSnapshotV2;
  if (snap.formulaVersion !== PACKAGING_PRICE_SNAPSHOT_VERSION) return snap;
  return snap;
}

export function isPackagingArticleId(articleId: string): boolean {
  return articleId.startsWith('pkg-');
}
