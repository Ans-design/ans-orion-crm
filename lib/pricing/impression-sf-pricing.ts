import { impressionSfMaterialByLabel } from '@/lib/data/impression-sf-material-catalog';
import {
  IMPRESSION_SF_PAPER_TARIFFS,
} from '@/lib/data/impression-sf-paper-tariffs';
import { isImpressionSfArticleId } from '@/lib/pos/impression-sf-policy';
import { pickTierUnitPrice } from '@/lib/pricing/tier-price';
import { isRectoVerso, resolveConfigFace } from '@/lib/pricing/config-normalize';
import {
  DEFAULT_PAPER_FORMAT_RULES,
  computePaperFormatPrice,
  findPaperFormatRule,
  resolvePaperFormatForCustomSize,
  type PaperFormatRuleLike,
} from '@/lib/pricing/paper-format-rules';
import {
  DEFAULT_SUPPORT_FACE_RULES,
  isRectoVersoAllowedForSupport,
  type SupportFaceRuleLike,
} from '@/lib/pricing/support-face-rules';
import {
  getPublishedIsfVolumeTiers,
  volumeRemiseRateFromTiers,
} from '@/lib/pricing/published-volume-tiers';
import {
  DEFAULT_PRINT_TECHNOLOGY_RULES,
  applyTechnologySupplement,
  findLaserSupplementAr,
  isOffsetStandardMaterial,
  isPersonalizedPaperGroupMember,
  parseImpressionType,
  type PrintTechnologyRuleLike,
  type ServicePriceEquivalenceLike,
  DEFAULT_SERVICE_EQUIVALENCES,
} from '@/lib/pricing/print-type-rules';
import {
  applyMaterialEquivalenceSupplement,
  DEFAULT_MATERIAL_EQUIVALENCES,
  type MaterialEquivalenceLike,
} from '@/lib/pricing/material-equivalence-rules';

export const COEFF_NIVEAUX_GRIS = 0.7;

/** @deprecated Prefer PaperFormatRule from DB — kept for legacy factor lookups. */
const FORMAT_FACTORS: Record<string, number> = {
  A6: 0.25,
  DL: 1 / 3,
  A5: 0.5,
  B5: 1,
  B6: 0.35,
  A4: 1,
  A3: 2,
  'A3+': 2.3,
  SRA3: 2.3,
  CARRE90: 0.125,
  '90×90': 0.125,
  '90x90': 0.125,
};

const PERSONALIZED_MARKERS = ['autres', 'personnalis', 'sur devis'];

let cachedFormatRules: PaperFormatRuleLike[] = DEFAULT_PAPER_FORMAT_RULES;
let cachedFaceRules: SupportFaceRuleLike[] = DEFAULT_SUPPORT_FACE_RULES;
let cachedTechRules: PrintTechnologyRuleLike[] = DEFAULT_PRINT_TECHNOLOGY_RULES;
let cachedServiceEquiv: ServicePriceEquivalenceLike[] = DEFAULT_SERVICE_EQUIVALENCES;
let cachedMaterialEquiv: MaterialEquivalenceLike[] = DEFAULT_MATERIAL_EQUIVALENCES;

/** Injecte les règles Admin (appelé après fetch DB / sync). */
export function setImpressionSfRuntimeRules(opts: {
  formatRules?: PaperFormatRuleLike[];
  faceRules?: SupportFaceRuleLike[];
  techRules?: PrintTechnologyRuleLike[];
  serviceEquivalences?: ServicePriceEquivalenceLike[];
  materialEquivalences?: MaterialEquivalenceLike[];
}) {
  if (opts.formatRules?.length) cachedFormatRules = opts.formatRules;
  if (opts.faceRules?.length) cachedFaceRules = opts.faceRules;
  if (opts.techRules?.length) cachedTechRules = opts.techRules;
  if (opts.serviceEquivalences?.length) cachedServiceEquiv = opts.serviceEquivalences;
  if (opts.materialEquivalences?.length) cachedMaterialEquiv = opts.materialEquivalences;
}

export function getImpressionSfFormatRules(): PaperFormatRuleLike[] {
  return cachedFormatRules;
}

export function getImpressionSfFaceRules(): SupportFaceRuleLike[] {
  return cachedFaceRules;
}

export function getImpressionSfTechRules(): PrintTechnologyRuleLike[] {
  return cachedTechRules;
}

export function getImpressionSfServiceEquivalences(): ServicePriceEquivalenceLike[] {
  return cachedServiceEquiv;
}

export type ImpressionSfPriceResult = {
  calculable: boolean;
  surDevis: boolean;
  prixUnitaire: number;
  priceKey?: string;
  formula?: string;
  missingField?: string;
};

export function isImpressionSfPricingArticle(articleId: string, category?: string): boolean {
  return isImpressionSfArticleId(articleId, category);
}

export function impressionSfVolumeRemiseRate(qty: number): number {
  return volumeRemiseRateFromTiers(qty, getPublishedIsfVolumeTiers());
}

export function impressionSfVolumeRemiseAmount(sousTotal: number, qty: number): number {
  return Math.round(sousTotal * impressionSfVolumeRemiseRate(qty));
}

function parseGramNum(raw: string): number {
  const m = String(raw ?? '').match(/(\d{2,4})/);
  return m ? parseInt(m[1], 10) : 0;
}

function isNbImpressionType(type: string): boolean {
  return parseImpressionType(type).colorMode === 'nb';
}

/** Clés matière DB pour lookup BasePrintingPrice (discrimine N&B vs Couleur sur Offset/Journal). */
export function resolveBasePrintingMaterialKeys(
  config: Record<string, unknown>,
): string[] {
  const matiere = String(config.matiere ?? config.material ?? config.materiau ?? config.support ?? '').trim();
  const type = String(config.type ?? '').trim();
  if (!matiere) return [];

  const parsed = parseImpressionType(type);
  const mat = impressionSfMaterialByLabel(matiere);
  const keys = [matiere];

  // Offset standard uniquement : NB / Quadri / Jet / Laser en clés distinctes
  if (isOffsetStandardMaterial(matiere, mat?.id)) {
    if (parsed.colorMode === 'nb') {
      keys.unshift(`${matiere} · N&B`);
    } else if (parsed.technology === 'laser') {
      keys.unshift(`${matiere} · Laser`, `${matiere} · Couleur`);
    } else {
      keys.unshift(`${matiere} · Jet`, `${matiere} · Couleur`);
    }
  }
  return keys;
}

export function storageMaterialKeyForIsfConfig(config: {
  matiere: string;
  grammage: string;
  type: string;
}): string {
  const keys = resolveBasePrintingMaterialKeys({
    matiere: config.matiere,
    type: config.type,
  });
  // Migration / seed DB : N&B vs Couleur (évite collision nb80/q80la via · Jet).
  // Lookup garde · Jet / · Laser en tête de resolveBasePrintingMaterialKeys.
  const colorKey = keys.find((k) => k.endsWith(' · Couleur') || k.endsWith(' · N&B'));
  return colorKey ?? keys[0] ?? config.matiere;
}

function hasPersonalizedOption(config: Record<string, unknown>): boolean {
  const keys = ['type', 'format', 'matiere', 'grammage', 'face'];
  return keys.some((k) => {
    const v = String(config[k] ?? '').toLowerCase();
    return PERSONALIZED_MARKERS.some((m) => v.includes(m));
  });
}

/** Protocole ANS RV : Prix RV = Prix R + (Prix R − Coût Matière). */
export function ansCalcRectoVersoPrice(prixRecto: number, coutMatiere = 0): number {
  const cout = coutMatiere > 0 ? coutMatiere : Math.round(prixRecto * 0.1);
  return Math.round(prixRecto + Math.max(0, prixRecto - cout));
}

export function applyImpressionColorCoeff(prix: number, impressionType: string): number {
  if (!impressionType) return prix;
  return isNbImpressionType(impressionType) ? Math.round(prix * COEFF_NIVEAUX_GRIS) : prix;
}

export function resolveImpressionSfPaperPriceKey(
  matiereLabel: string,
  grammage: string,
  impressionType: string,
): string | null {
  const mat = impressionSfMaterialByLabel(matiereLabel);
  const matId = mat?.id ?? '';
  const gram = parseGramNum(grammage);
  const parsed = parseImpressionType(impressionType);

  if (!matiereLabel.trim()) return null;

  // PRIX 2026 : Toile fin (2500) et Invitation luxe (2000) = grilles distinctes
  if (matId === 'invitation' || /invitation/i.test(matiereLabel)) {
    return 'invitation';
  }
  if (matId === 'toile_fin' || /^toile\b/i.test(matiereLabel.trim())) {
    return 'toile';
  }

  // Satiné / papier personnalisé → grille toile de référence (fallback)
  if (isPersonalizedPaperGroupMember(matId, matiereLabel)) {
    return 'toile';
  }

  if (matId === 'autres' || /personnalis/i.test(matiereLabel)) {
    return 'toile';
  }

  // Offset standard : NB ≠ Quadri ; Laser dérivé de Jet (+ supplément Admin)
  if (isOffsetStandardMaterial(matiereLabel, matId) || matId === 'standard' || matId === 'journal') {
    if (parsed.colorMode === 'nb') return 'nb80';
    // q80la = base Jet/Quadri ; laser appliqué ensuite via supplement
    return 'q80la';
  }

  if (matId === 'autocollant' || matId === 'collant_glossy' || matId === 'adestor') return 'autocollant';
  if (matId === 'pvc_transl') return 'pvc_transl';
  if (matId === 'pvc_opaque') return 'pvc_opaque';
  if (matId === 'sublimation') return 'sublimation';

  // Pelliculé mat/brillant — grille dédiée (PCB + pelliculage), pas l’alias PCB nu
  if (matId === 'pellicule' || /pellicul/i.test(matiereLabel)) {
    if (gram >= 350 || /370/i.test(grammage)) return 'pellicule370';
    return 'pellicule320';
  }

  if (['pcb', 'pcm', 'glossy', 'texture', 'bristol', 'contre_colle', 'satine_mat', 'mat'].includes(matId)) {
    if (gram >= 900) return 'pcb900';
    if (gram >= 700) return 'pcb700';
    if (gram >= 600) return 'pcb600';
    // Catalogue 2026 : PCB/PCM 300g A4 recto = 1 500 Ar (même grille que 350g)
    if (gram >= 300) return 'pcb350';
    if (gram > 170) return 'pcb170';
    if (gram > 135) return 'pcb135';
    return 'pcb90';
  }

  return null;
}

export function impressionSfFormatFactor(config: Record<string, unknown>): number {
  const format = String(config.format ?? '').trim();
  const wMm = Number(config.format_largeur) || Number(config.largeur_mm) || 0;
  const hMm = Number(config.format_hauteur) || Number(config.hauteur_mm) || 0;
  const rules = cachedFormatRules;

  if (/personnalis/i.test(format) && wMm > 0 && hMm > 0) {
    const resolved = resolvePaperFormatForCustomSize(wMm, hMm, rules);
    if (resolved.rule) {
      // Facteur effectif vs A4=1000 pour compat moteur multiplicatif
      const { price } = computePaperFormatPrice(1000, resolved.rule, rules);
      return price / 1000;
    }
    return 1;
  }

  const rule = findPaperFormatRule(format, rules);
  if (rule) {
    const { price } = computePaperFormatPrice(1000, rule, rules);
    return price / 1000;
  }

  if (FORMAT_FACTORS[format] != null) return FORMAT_FACTORS[format];

  const canonical = format.replace(/\bSRA3\b/gi, 'A3+');
  if (FORMAT_FACTORS[canonical] != null) return FORMAT_FACTORS[canonical];

  const aMatch = format.match(/\b(A[0-7]\+?|DL|SRA3|B5|B6)\b/i);
  if (aMatch) {
    const key = aMatch[1].toUpperCase().replace('SRA3', 'A3+');
    const r2 = findPaperFormatRule(key, rules);
    if (r2) {
      const { price } = computePaperFormatPrice(1000, r2, rules);
      return price / 1000;
    }
    if (FORMAT_FACTORS[key] != null) return FORMAT_FACTORS[key];
    return FORMAT_FACTORS[key.replace('+', '')] ?? 1;
  }

  return 1;
}

/**
 * Applique prix A4 + règle format (découpe/supplément) — justesse métier.
 * Si a4UnitPrice fourni, calcule le PU format exact ; sinon facteur legacy.
 */
export function applyImpressionSfFormatPrice(
  a4UnitPrice: number,
  config: Record<string, unknown>,
): { prixUnitaire: number; formatUsed: string; formula: string; surDevis?: boolean } {
  const format = String(config.format ?? '').trim();
  const wMm = Number(config.format_largeur) || Number(config.largeur_mm) || 0;
  const hMm = Number(config.format_hauteur) || Number(config.hauteur_mm) || 0;
  const rules = cachedFormatRules;

  if (/personnalis/i.test(format) && wMm > 0 && hMm > 0) {
    const resolved = resolvePaperFormatForCustomSize(wMm, hMm, rules);
    if (!resolved.rule || resolved.surDevis) {
      return {
        prixUnitaire: 0,
        formatUsed: '',
        formula: resolved.reason,
        surDevis: true,
      };
    }
    const { price, formula } = computePaperFormatPrice(a4UnitPrice, resolved.rule, rules);
    return { prixUnitaire: price, formatUsed: resolved.formatUsed!, formula };
  }

  const rule = findPaperFormatRule(format, rules);
  if (rule) {
    const { price, formula } = computePaperFormatPrice(a4UnitPrice, rule, rules);
    return { prixUnitaire: price, formatUsed: rule.formatCode, formula };
  }

  const factor = impressionSfFormatFactor(config);
  return {
    prixUnitaire: Math.round(a4UnitPrice * factor),
    formatUsed: format || 'A4',
    formula: `legacy_factor×${factor}`,
  };
}

export function paperTierUnitPrice(priceKey: string, qty: number): number {
  const entry = IMPRESSION_SF_PAPER_TARIFFS[priceKey];
  if (!entry?.tiers?.length) return 0;
  return pickTierUnitPrice(entry.tiers, qty, 0);
}

export function computeImpressionSfPrice(
  config: Record<string, unknown>,
  qty = 1,
): ImpressionSfPriceResult {
  // Options vraiment « sur devis » (format/matière personnalisés hors groupe prix)
  const matiereEarly = String(config.matiere ?? config.paperType ?? '').trim();
  const matEarly = impressionSfMaterialByLabel(matiereEarly);
  const personalizedSurDevis =
    hasPersonalizedOption(config)
    && !isPersonalizedPaperGroupMember(matEarly?.id ?? '', matiereEarly)
    && !isOffsetStandardMaterial(matiereEarly, matEarly?.id);

  if (personalizedSurDevis && /personnalis/i.test(String(config.format ?? ''))) {
    const wMm = Number(config.format_largeur) || Number(config.largeur_mm) || 0;
    const hMm = Number(config.format_hauteur) || Number(config.hauteur_mm) || 0;
    // Sans dimensions → devis. Avec L×l → on continue (règle format supérieur / prix exact).
    if (!(wMm > 0 && hMm > 0)) {
      return {
        calculable: false,
        surDevis: true,
        prixUnitaire: 0,
        formula: 'format_personnalise_dims_manquantes',
        missingField: 'format_dimensions',
      };
    }
  }

  const matiere = matiereEarly;
  const grammage = String(config.grammage ?? config.paperWeight ?? '').trim();
  const impressionTypeRaw = String(config.type ?? '').trim();
  const parsed = parseImpressionType(impressionTypeRaw);
  // Photocopie = Impression (équivalence service)
  const impressionType = parsed.isPhotocopie
    ? parsed.pricingTypeLabel
    : impressionTypeRaw;

  if (!matiere) {
    return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'incomplete' };
  }

  const mat = impressionSfMaterialByLabel(matiere);
  const offset = isOffsetStandardMaterial(matiere, mat?.id);

  const priceKey = resolveImpressionSfPaperPriceKey(matiere, grammage, impressionType);
  if (!priceKey) {
    return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'no_tarif_match' };
  }

  let pu = paperTierUnitPrice(priceKey, qty);
  if (pu <= 0) {
    return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'tarif_zero' };
  }

  let formulaExtra = '';

  // Équivalences matières (Offset 70 = 80−20, Offset 100 = 90+50, etc.)
  const gramNum = parseInt(String(grammage).replace(/\D/g, ''), 10) || 0;
  if (gramNum > 0) {
    // Offset 100G : référence = Offset 90G (= 80G + supplément 90), puis +50
    let equivBase = pu;
    if (gramNum === 100 && (offset || /offset|standard/i.test(matiere))) {
      const as90 = applyMaterialEquivalenceSupplement(pu, matiere, 90, cachedMaterialEquiv);
      equivBase = as90.price;
    }
    const equiv = applyMaterialEquivalenceSupplement(equivBase, matiere, gramNum, cachedMaterialEquiv);
    if (equiv.applied) {
      pu = equiv.price;
      formulaExtra = `|equiv:${equiv.applied.materialKey}${equiv.applied.supplementAr >= 0 ? '+' : ''}${equiv.applied.supplementAr}`;
    }
  }

  // Offset + Laser Quadri : Jet + supplément Admin (défaut 100 Ar)
  if (offset && parsed.colorMode === 'quadri' && parsed.technology === 'laser') {
    const supplement = findLaserSupplementAr(cachedTechRules, {
      offsetOnly: true,
      colorMode: 'quadri',
    });
    pu = applyTechnologySupplement(pu, supplement);
    formulaExtra += `|laser+${supplement}`;
  }

  const formatted = applyImpressionSfFormatPrice(pu, config);
  if (formatted.surDevis) {
    return { calculable: false, surDevis: true, prixUnitaire: 0, formula: formatted.formula };
  }
  pu = formatted.prixUnitaire;

  if (isRectoVerso(resolveConfigFace(config))) {
    if (!isRectoVersoAllowedForSupport(matiere, cachedFaceRules)) {
      return {
        calculable: false,
        surDevis: true,
        prixUnitaire: 0,
        formula: 'verso_interdit_support',
        priceKey,
      };
    }
    pu = ansCalcRectoVersoPrice(pu);
  }

  // Hors offset : même prix quel que soit le type (pas de coeff N&B)
  // Offset : NB/Quadri déjà séparés via priceKey — ne pas appliquer coeff 0.7

  return {
    calculable: true,
    surDevis: false,
    prixUnitaire: pu,
    priceKey,
    formula: `isf:${priceKey}|${formatted.formula}${formulaExtra}${parsed.isPhotocopie ? '|photocopie=impression' : ''}`,
  };
}
