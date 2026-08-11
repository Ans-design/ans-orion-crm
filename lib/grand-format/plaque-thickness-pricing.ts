/**
 * Prix m² plaques PVC / Plexi selon épaisseur (grilles PRIX 2026).
 * Les cartes parentes `gf-pvc` / `gf-plexi` exposent l’épaisseur ; le live doit
 * basculer vers le tarif variante (pas le forfait « à partir de » seul).
 */

import { entryGrandFormatPrix2026 } from '@/lib/data/prix-2026-grids/grand-format';

export type PlaqueThicknessFamily = 'pvc' | 'plexi';

export type PlaqueThicknessPriceResolution = {
  family: PlaqueThicknessFamily;
  thicknessMm: number | null;
  /** Article tarifaire (ex. gf-pvc6) utilisé pour le m². */
  variantArticleId: string;
  prixM2: number | null;
  surDevis: boolean;
  tierLabel: string | null;
  reason?: string;
};

const PVC_IDS = new Set(['gf-pvc', 'gf-pvc3', 'gf-pvc6']);
const PLEXI_IDS = new Set(['gf-plexi', 'gf-plexi3', 'gf-plexi5', 'gf-acrylic']);

export function getPlaqueThicknessFamily(articleId: string): PlaqueThicknessFamily | null {
  if (PVC_IDS.has(articleId)) return 'pvc';
  if (PLEXI_IDS.has(articleId)) return 'plexi';
  return null;
}

export function isPlaqueThicknessArticleId(articleId: string): boolean {
  return getPlaqueThicknessFamily(articleId) != null;
}

/** Parse « 3 mm », « 5mm », ou epaisseur_autre numérique. */
export function parsePlaqueThicknessMm(config: Record<string, unknown>): number | null {
  const chip = String(config.epaisseur ?? '').trim();
  if (!chip) return null;
  if (/autres|personnalis/i.test(chip)) {
    const raw = String(config.epaisseur_autre ?? '').replace(',', '.').trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const m = chip.match(/(\d+(?:[.,]\d+)?)\s*mm/i) ?? chip.match(/^(\d+(?:[.,]\d+)?)$/);
  if (!m) return null;
  const n = parseFloat(m[1]!.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function entry(id: string, fallback: number): number {
  return entryGrandFormatPrix2026(id) ?? fallback;
}

/**
 * Résout le prix / m² plaque selon épaisseur.
 * - PVC : ≤3,5 mm → 110 k ; 5–6,5 mm → 160 k ; sinon sur devis
 * - Plexi : ≤3,5 mm → 200 k ; ~5 mm → 240 k ; sinon sur devis
 * Sans épaisseur : tarif de l’article courant (entrée catalogue).
 */
export function resolvePlaqueThicknessPrixM2(
  articleId: string,
  config: Record<string, unknown>,
  basePrixM2?: number | null,
): PlaqueThicknessPriceResolution | null {
  const family = getPlaqueThicknessFamily(articleId);
  if (!family) return null;

  const thicknessMm = parsePlaqueThicknessMm(config);
  const base =
    basePrixM2 != null && basePrixM2 > 0
      ? basePrixM2
      : entry(articleId, family === 'pvc' ? 110_000 : 200_000);

  if (thicknessMm == null) {
    const chip = String(config.epaisseur ?? '').trim();
    if (/autres|personnalis/i.test(chip)) {
      return {
        family,
        thicknessMm: null,
        variantArticleId: articleId,
        prixM2: null,
        surDevis: true,
        tierLabel: null,
        reason: 'Épaisseur personnalisée — devis manuel.',
      };
    }
    return {
      family,
      thicknessMm: null,
      variantArticleId: articleId,
      prixM2: base,
      surDevis: false,
      tierLabel: null,
    };
  }

  if (family === 'pvc') {
    if (thicknessMm <= 3.5) {
      return {
        family,
        thicknessMm,
        variantArticleId: 'gf-pvc3',
        prixM2: entry('gf-pvc3', 110_000),
        surDevis: false,
        tierLabel: 'PVC ≤ 3 mm',
      };
    }
    if (thicknessMm >= 5 && thicknessMm <= 6.5) {
      return {
        family,
        thicknessMm,
        variantArticleId: 'gf-pvc6',
        prixM2: entry('gf-pvc6', 160_000),
        surDevis: false,
        tierLabel: 'PVC 5–6 mm',
      };
    }
    return {
      family,
      thicknessMm,
      variantArticleId: articleId,
      prixM2: null,
      surDevis: true,
      tierLabel: null,
      reason: `PVC ${thicknessMm} mm hors grille (3 / 5–6 mm) — sur devis.`,
    };
  }

  // plexi / acrylic
  if (thicknessMm <= 3.5) {
    return {
      family,
      thicknessMm,
      variantArticleId: 'gf-plexi3',
      prixM2: entry('gf-plexi3', 200_000),
      surDevis: false,
      tierLabel: 'Plexi ≤ 3 mm',
    };
  }
  if (thicknessMm >= 4.5 && thicknessMm <= 5.5) {
    return {
      family,
      thicknessMm,
      variantArticleId: 'gf-plexi5',
      prixM2: entry('gf-plexi5', 240_000),
      surDevis: false,
      tierLabel: 'Plexi 5 mm',
    };
  }
  return {
    family,
    thicknessMm,
    variantArticleId: articleId,
    prixM2: null,
    surDevis: true,
    tierLabel: null,
    reason: `Plexi ${thicknessMm} mm hors grille (3 / 5 mm) — sur devis.`,
  };
}
