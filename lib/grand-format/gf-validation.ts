import { BACHE_CANONICAL_ID } from '@/lib/pos/bache-catalog';
import { parseGrandFormatDimensionsCm } from '@/lib/dimensions/grand-format-units';
import {
  getPlaqueThicknessFamily,
  parsePlaqueThicknessMm,
  resolvePlaqueThicknessPrixM2,
} from '@/lib/grand-format/plaque-thickness-pricing';
import { getGfArticleMeta } from '@/lib/grand-format/article-meta';
import { isGrandFormatCustomFormat, shouldApplyGfLaizeRules } from '@/lib/grand-format/pricing';

/** Validation GF (hors bâche unifiée) avant ajout panier. */
export function validateGfConfig(
  articleId: string,
  config: Record<string, unknown>,
): string | null {
  if (!articleId.startsWith('gf-') || articleId === BACHE_CANONICAL_ID) return null;

  const isCustom = isGrandFormatCustomFormat(config);
  if (isCustom) {
    const dims = parseGrandFormatDimensionsCm(config);
    if (!dims?.longueurCm || !dims?.largeurCm) {
      return 'Veuillez renseigner les dimensions (cm).';
    }
  }

  // Laize / dimension plaque : uniquement format personnalisé (ISO A0–A5 hors laize).
  if (shouldApplyGfLaizeRules(config)) {
    const isPlaque = getGfArticleMeta(articleId)?.stockKind === 'plaque';
    const laizeChip = String(config.laize ?? config.laize_plaque ?? '').trim();
    const laizeAutre = parseFloat(String(config.laize_autre ?? config.laize_plaque_autre ?? ''));
    if (!laizeChip && !(Number.isFinite(laizeAutre) && laizeAutre > 0)) {
      return isPlaque
        ? 'Veuillez sélectionner la dimension plaque.'
        : 'Veuillez sélectionner la laize.';
    }
    if (laizeChip.toLowerCase().includes('autre') && !(Number.isFinite(laizeAutre) && laizeAutre > 0)) {
      return isPlaque
        ? 'Veuillez indiquer la largeur plaque personnalisée (cm).'
        : 'Veuillez indiquer la laize personnalisée (cm).';
    }
  }

  if (getPlaqueThicknessFamily(articleId)) {
    const chip = String(config.epaisseur ?? '').trim();
    if (!chip) return 'Veuillez sélectionner l’épaisseur.';
    if (/autres|personnalis/i.test(chip) && parsePlaqueThicknessMm(config) == null) {
      return 'Veuillez indiquer l’épaisseur personnalisée (mm).';
    }
    const resolved = resolvePlaqueThicknessPrixM2(articleId, config);
    if (resolved?.surDevis) {
      return resolved.reason ?? 'Épaisseur hors grille — devis manuel.';
    }
  }

  const qty = Number(config.qty ?? config.quantite ?? 0);
  if (!qty || qty <= 0) return 'Veuillez renseigner la quantité.';

  return null;
}
