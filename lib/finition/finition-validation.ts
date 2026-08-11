import {
  isCornerRoundingComplete,
  parseCornerRounding,
} from '@/lib/finition/corner-rounding';
import {
  computeSurfaceM2,
  isPoseGrandFormat,
  isPosePetitFormat,
} from '@/lib/finition/finition-field-policy';

const FINITION_IDS = new Set([
  'fin-coins',
  'fin-dorure',
  'fin-pelliculage',
  'fin-vernis',
  'fin-plastification',
  'fin-rainage',
  'fin-reliure',
  'fin-autocollant',
]);

export function validateFinitionConfig(
  articleId: string,
  config: Record<string, unknown>,
): string | null {
  if (!FINITION_IDS.has(articleId)) return null;

  if (articleId === 'fin-coins') {
    const cr = parseCornerRounding(config.cornerRounding);
    if (!isCornerRoundingComplete(cr)) {
      return `Veuillez sélectionner exactement ${cr.limit} coin${cr.limit > 1 ? 's' : ''} à arrondir.`;
    }
  }

  if (articleId === 'fin-dorure') {
    if (!config.dim) return 'Veuillez sélectionner le format de dorure.';
  }

  if (articleId === 'fin-pelliculage') {
    if (config.type === 'Mat' && config.sous_type === 'Pelliculage à froid') {
      return 'Pelliculage mat : seul le procédé à chaud est autorisé.';
    }
  }

  if (articleId === 'fin-autocollant') {
    const t = String(config.type ?? '');
    if (isPoseGrandFormat(t)) {
      const l = parseFloat(String(config.longueur_pose ?? 0));
      const w = parseFloat(String(config.largeur_pose ?? 0));
      if (!l || l <= 0) return 'Veuillez saisir la longueur de pose.';
      if (!w || w <= 0) return 'Veuillez saisir la largeur de pose.';
      if (!config.hauteur_pose) return 'Veuillez sélectionner la hauteur / accessibilité de pose.';
      computeSurfaceM2(l, w);
    } else if (isPosePetitFormat(t) || t.includes('personnalis')) {
      // type + qty validated by progress fields
    } else if (!t) {
      return 'Veuillez sélectionner le type de pose autocollant.';
    }
  }

  if (articleId === 'fin-rainage') {
    if (!config.plis) return 'Veuillez sélectionner le nombre de plis.';
  }

  return null;
}
