/**
 * Moteur tarifaire Goodies : prix vierge + technique + suppléments.
 * Cas spécial porte-clé PVC souple : PVC opaque A4 / diviseur + découpe + attache + technique.
 */

export const GOODIES_PRICING_IDS = new Set([
  'gd-tapis',
  'gd-stylo',
  'gd-portecles',
  'gd-pins',
  'gd-parapluie',
  'gd-mug',
  'gd-housse',
  'gd-gourde',
  'gd-usb',
  'gd-briquet',
  'gd-tasse',
]);

export function isGoodiesArticleId(articleId: string): boolean {
  return GOODIES_PRICING_IDS.has(articleId) || articleId.startsWith('gd-');
}

export type GoodiesOptionHit = {
  fieldKey: string;
  label: string;
  priceModifier: number;
  metadata?: Record<string, unknown> | null;
};

export type GoodiesPricingInput = {
  articleId: string;
  config: Record<string, unknown>;
  /** Options actives issues du contexte dynamique (groupes DB) */
  optionHits: GoodiesOptionHit[];
  /** Params Admin (addons non visibles POS) */
  params?: {
    pvcOpaqueA4?: number;
    pvcDiviseurA4?: number;
    decoupe?: number;
    attache?: number;
  };
};

export type GoodiesPricingResult = {
  unitPrice: number;
  blankPrice: number;
  techniquePrice: number;
  addonsPrice: number;
  formula: string;
  pipeline: Record<string, unknown>;
};

function cfgStr(config: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = config[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

function isPvcSoupleKeychain(config: Record<string, unknown>): boolean {
  const type = cfgStr(config, 'type');
  const matiere = cfgStr(config, 'matiere');
  return /pvc\s*souple/i.test(type) || /pvc\s*souple/i.test(matiere);
}

function findHit(hits: GoodiesOptionHit[], fieldKey: string, label: string): GoodiesOptionHit | undefined {
  const want = label.trim().toLowerCase();
  return hits.find(
    (h) => h.fieldKey === fieldKey && h.label.trim().toLowerCase() === want,
  );
}

function findAnyHit(hits: GoodiesOptionHit[], fieldKeys: string[], label: string): GoodiesOptionHit | undefined {
  for (const fk of fieldKeys) {
    const h = findHit(hits, fk, label);
    if (h) return h;
  }
  return undefined;
}

/**
 * Calcule le prix unitaire Goodies (hors paliers qty).
 */
export function computeGoodiesUnitPrice(input: GoodiesPricingInput): GoodiesPricingResult {
  const { articleId, config, optionHits, params } = input;
  const pipeline: Record<string, unknown> = { engine: 'goodies', articleId };

  const techniqueLabel = cfgStr(config, 'technique');
  const techHit = techniqueLabel
    ? findHit(optionHits, 'technique', techniqueLabel)
    : undefined;
  const techniquePrice = techHit?.priceModifier ?? 0;
  pipeline.technique = { label: techniqueLabel || null, price: techniquePrice };

  // Suppléments sélectionnés (hors params PVC)
  let addonsPrice = 0;
  const addonFields = ['supplements', 'attache', 'decoupe'];
  for (const fk of addonFields) {
    const selected = cfgStr(config, fk);
    if (!selected || /sans|aucun|non\b/i.test(selected)) continue;
    const hit = findHit(optionHits, fk, selected);
    if (hit) {
      addonsPrice += hit.priceModifier;
      pipeline[`addon_${fk}`] = { label: selected, price: hit.priceModifier };
    }
  }

  // Porte-clé PVC souple — formule spéciale
  if (articleId === 'gd-portecles' && isPvcSoupleKeychain(config)) {
    const pvcA4 = params?.pvcOpaqueA4 ?? 13000;
    const diviseur = params?.pvcDiviseurA4 && params.pvcDiviseurA4 > 0 ? params.pvcDiviseurA4 : 20;
    const decoupe = params?.decoupe ?? 50;
    const attache = params?.attache ?? 300;
    const blankPrice = Math.round(pvcA4 / diviseur);
    const unitPrice = blankPrice + decoupe + attache + techniquePrice;
    const formula = `(${pvcA4}/${diviseur})+${decoupe}+${attache}+${techniquePrice}`;
    pipeline.pvcSouple = { pvcA4, diviseur, blankPrice, decoupe, attache, techniquePrice };
    return {
      unitPrice,
      blankPrice,
      techniquePrice,
      addonsPrice: decoupe + attache,
      formula,
      pipeline,
    };
  }

  // Prix vierge : chip modèle sur type / format / contenance / capacite / diametre / taille
  const primaryKeys = ['type', 'format', 'contenance', 'capacite', 'diametre', 'taille', 'modele'];
  let blankPrice = 0;
  let blankLabel = '';
  for (const fk of primaryKeys) {
    const label = cfgStr(config, fk);
    if (!label) continue;
    const hit = findAnyHit(optionHits, [fk], label);
    if (hit && hit.priceModifier > 0) {
      blankPrice = hit.priceModifier;
      blankLabel = label;
      pipeline.blankField = fk;
      break;
    }
  }
  // Fallback : première option modèle avec prix si config incomplète
  if (blankPrice === 0) {
    const modelHit = optionHits.find(
      (h) => primaryKeys.includes(h.fieldKey) && h.priceModifier > 0,
    );
    if (modelHit && !cfgStr(config, modelHit.fieldKey)) {
      // ne pas auto-appliquer si l'utilisateur n'a rien choisi
    } else if (modelHit) {
      const sel = cfgStr(config, modelHit.fieldKey);
      if (sel && modelHit.label === sel) {
        blankPrice = modelHit.priceModifier;
        blankLabel = modelHit.label;
      }
    }
  }

  pipeline.blank = { label: blankLabel || null, price: blankPrice };
  const unitPrice = blankPrice + techniquePrice + addonsPrice;
  const formula = `${blankPrice}+${techniquePrice}+${addonsPrice}`;

  return {
    unitPrice,
    blankPrice,
    techniquePrice,
    addonsPrice,
    formula,
    pipeline,
  };
}

/** Helpers tests acceptation */
export function computeTapisExample(blank = 9000, technique = 1000): number {
  return blank + technique;
}

export function computeStyloExample(blank = 4000, technique = 500): number {
  return blank + technique;
}

export function computePorteClePvcExample(opts?: {
  pvcA4?: number;
  diviseur?: number;
  decoupe?: number;
  attache?: number;
  technique?: number;
}): number {
  const pvcA4 = opts?.pvcA4 ?? 13000;
  const diviseur = opts?.diviseur ?? 20;
  const decoupe = opts?.decoupe ?? 50;
  const attache = opts?.attache ?? 300;
  const technique = opts?.technique ?? 0;
  return Math.round(pvcA4 / diviseur) + decoupe + attache + technique;
}
