import { evaluateBache } from '@/lib/grand-format/bache-rules';
import { impressionAllowsRectoVerso } from '@/lib/print/grand-format-laize-rules';
import { eyeletsFromConfig, parseBacheEyelets } from '@/lib/grand-format/bache-eyelets';
import { getBacheDimensionsM, getBacheDimensionsCm } from '@/lib/grand-format/bache-rules';
import { isGrandFormatCustomFormat, shouldApplyGfLaizeRules } from '@/lib/grand-format/pricing';

const AUTRES = 'Autres';

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || String(v).trim() === '';
}

function hasValidDimensions(config: Record<string, unknown>): boolean {
  const fmt = String(config.format ?? '').toLowerCase();
  if (!fmt) return false;
  if (!isGrandFormatCustomFormat(config)) {
    const { longueurM, hauteurM } = getBacheDimensionsM(config);
    return longueurM > 0 && hauteurM > 0;
  }
  const { longueurCm, largeurCm } = getBacheDimensionsCm(config);
  return longueurCm > 0 && largeurCm > 0;
}

export function validateBacheConfig(config: Record<string, unknown>): string | null {
  if (isEmpty(config.type_bache)) return 'Veuillez sélectionner le type.';
  if (isEmpty(config.grammage)) return 'Veuillez sélectionner le grammage.';

  if (isEmpty(config.format)) return 'Veuillez sélectionner le format.';

  if (isGrandFormatCustomFormat(config)) {
    const { longueurCm, largeurCm } = getBacheDimensionsCm(config);
    if (!longueurCm || longueurCm <= 0) return 'Veuillez renseigner la longueur.';
    if (!largeurCm || largeurCm <= 0) return 'Veuillez renseigner la largeur / hauteur.';
  }

  if (!hasValidDimensions(config)) {
    return shouldApplyGfLaizeRules(config)
      ? 'Veuillez saisir les dimensions avant de choisir la laize.'
      : 'Veuillez sélectionner un format valide.';
  }

  // Laize obligatoire uniquement en format personnalisé.
  if (shouldApplyGfLaizeRules(config)) {
    if (isEmpty(config.laize) && isEmpty(config.laize_autre)) {
      return 'Veuillez sélectionner la laize.';
    }
  }
  if (isEmpty(config.dos)) return 'Veuillez sélectionner la couleur du dos.';
  if (isEmpty(config.aspect)) return 'Veuillez sélectionner l\'aspect.';

  const dos = String(config.dos ?? '');
  const face = String(config.face ?? '');
  if (face.toLowerCase().includes('verso') && !impressionAllowsRectoVerso(dos)) {
    return 'Le recto-verso est disponible uniquement avec dos blanc.';
  }

  const { longueurM, hauteurM } = getBacheDimensionsM(config);
  const eyeData = parseBacheEyelets(config.oeillets_data ?? config.oeillets);
  if (eyeData.mode === 'Nombre personnalisé') {
    const count = eyeData.customCount ?? eyeData.count ?? Number(config.oeillets_custom ?? 0);
    if (!count || count < 4) {
      return 'Nombre personnalisé : minimum 4 œillets (coins obligatoires).';
    }
  }
  if (eyeData.mode === 'Placement manuel') {
    const positions = Array.isArray(eyeData.positions) ? eyeData.positions : [];
    if (positions.length < 4) {
      return 'Placement manuel : les 4 coins sont obligatoires.';
    }
  }

  const ev = evaluateBache(config);
  if (ev.surfaceReelleM2 <= 0) return 'La surface doit être supérieure à 0 m².';

  const qty = Number(config.qty ?? config.quantite ?? 0);
  if (!qty || qty <= 0) return 'Veuillez renseigner la quantité.';

  if (
    String(config.type_bache) === AUTRES ||
    String(config.grammage) === AUTRES ||
    String(config.dos) === AUTRES ||
    String(config.aspect) === AUTRES
  ) {
    const rem = String(config.remarques ?? config.type_bache_autre ?? '').trim();
    if (!rem) return 'Option « Autres » : veuillez détailler en remarque.';
  }

  if (ev.warnings.some((w) => w.includes('Stock insuffisant')) && !config.stock_override) {
    return 'Stock insuffisant pour cette configuration.';
  }

  // Ne PAS bloquer sur « sur devis » / tarif ici :
  // evaluateBache() sans prixM2 Admin → faux négatif alors que le POS a déjà
  // un prix serveur (priceReady). Le panier reste gateé par priceReady.

  return null;
}

export function isBacheConfigValid(config: Record<string, unknown>): boolean {
  return validateBacheConfig(config) === null;
}
