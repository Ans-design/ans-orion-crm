/**
 * Équivalences matières + règles papier épais (P1).
 */

export type MaterialEquivalenceLike = {
  materialKey: string;
  materialLabel: string;
  grammageMin: number;
  grammageMax: number | null;
  referenceMaterial: string;
  referenceGrammage: string | null;
  supplementAr: number;
  identicalPrice: boolean;
  priceGroup?: string | null;
  active?: boolean;
};

export const DEFAULT_MATERIAL_EQUIVALENCES: MaterialEquivalenceLike[] = [
  {
    materialKey: 'offset_70',
    materialLabel: 'Offset 70G',
    grammageMin: 70,
    grammageMax: 70,
    referenceMaterial: 'Offset',
    referenceGrammage: '80G',
    supplementAr: -20,
    identicalPrice: false,
  },
  {
    materialKey: 'offset_100',
    materialLabel: 'Offset 100G',
    grammageMin: 100,
    grammageMax: 100,
    referenceMaterial: 'Offset',
    referenceGrammage: '90G',
    supplementAr: 50,
    identicalPrice: false,
  },
  {
    materialKey: 'standard_90',
    materialLabel: 'Papier standard 90G / journal / autocopiant',
    grammageMin: 85,
    grammageMax: 99,
    referenceMaterial: 'Standard / Offset',
    referenceGrammage: '80G',
    supplementAr: 20,
    identicalPrice: false,
  },
  {
    materialKey: 'pcb_pcm_glossy_90_135',
    materialLabel: 'PCB / PCM / Glossy 90–135G',
    grammageMin: 90,
    grammageMax: 135,
    referenceMaterial: 'PCB',
    referenceGrammage: '90-135G',
    supplementAr: 0,
    identicalPrice: true,
  },
  {
    materialKey: 'pcb_pcm_glossy_135_180',
    materialLabel: 'PCB / PCM / Glossy 135–180G',
    grammageMin: 135,
    grammageMax: 180,
    referenceMaterial: 'PCB',
    referenceGrammage: '90-135G',
    supplementAr: 50,
    identicalPrice: false,
  },
  {
    materialKey: 'satine',
    materialLabel: 'Satiné / satiné mat',
    grammageMin: 0,
    grammageMax: null,
    referenceMaterial: 'Toile fin',
    referenceGrammage: null,
    supplementAr: 0,
    identicalPrice: true,
    priceGroup: 'papier_personnalise',
  },
  {
    materialKey: 'toile_fin',
    materialLabel: 'Toile fin',
    grammageMin: 0,
    grammageMax: null,
    referenceMaterial: 'Toile fin',
    referenceGrammage: null,
    supplementAr: 0,
    identicalPrice: true,
    priceGroup: 'papier_personnalise',
  },
  {
    materialKey: 'invitation',
    materialLabel: 'Spécial invitation',
    grammageMin: 0,
    grammageMax: null,
    referenceMaterial: 'Toile fin',
    referenceGrammage: null,
    supplementAr: 0,
    identicalPrice: true,
    priceGroup: 'papier_personnalise',
  },
  {
    materialKey: 'papier_personnalise',
    materialLabel: 'Matière papier personnalisé',
    grammageMin: 0,
    grammageMax: null,
    referenceMaterial: 'Toile fin',
    referenceGrammage: null,
    supplementAr: 0,
    identicalPrice: true,
    priceGroup: 'papier_personnalise',
  },
];

export type ThickPaperRuleLike = {
  supportType: string;
  grammageMin: number;
  grammageMax: number | null;
  formula: string;
  referencePriceKey: string | null;
  supplementAr: number;
  blankMaterialRequired: boolean;
  blankLayers: number;
  finishingRequired: string | null;
  active?: boolean;
  details?: string | null;
};

export const DEFAULT_THICK_PAPER_RULES: ThickPaperRuleLike[] = [
  {
    supportType: 'papier',
    grammageMin: 301,
    grammageMax: 400,
    formula: 'prix_300g + supplement',
    referencePriceKey: 'pcb350',
    supplementAr: 100,
    blankMaterialRequired: false,
    blankLayers: 0,
    finishingRequired: null,
    details: '300–400G = prix impression 300G + 100 Ar',
  },
  {
    supportType: 'papier',
    grammageMin: 401,
    grammageMax: 600,
    formula: 'prix_300g + vierge + collage',
    referencePriceKey: 'pcb350',
    supplementAr: 0,
    blankMaterialRequired: true,
    blankLayers: 1,
    finishingRequired: 'Collage contre-collé',
    details: '400–600G = 300G imprimé + papier vierge + collage',
  },
  {
    supportType: 'papier',
    grammageMin: 601,
    grammageMax: null,
    formula: 'prix_300g + 2×vierge + collage',
    referencePriceKey: 'pcb600',
    supplementAr: 0,
    blankMaterialRequired: true,
    blankLayers: 2,
    finishingRequired: 'Collage contre-collé',
    details: '600G+ = 300G imprimé + 2×vierge 300G + collage',
  },
];

export function findThickPaperRule(
  grammage: number,
  rules: ThickPaperRuleLike[] = DEFAULT_THICK_PAPER_RULES,
): ThickPaperRuleLike | null {
  if (!(grammage > 0)) return null;
  return (
    rules
      .filter((r) => r.active !== false)
      .find((r) => grammage >= r.grammageMin && (r.grammageMax == null || grammage <= r.grammageMax))
    ?? null
  );
}

export function applyMaterialEquivalenceSupplement(
  basePrice: number,
  materialLabel: string,
  grammage: number,
  rules: MaterialEquivalenceLike[] = DEFAULT_MATERIAL_EQUIVALENCES,
): { price: number; applied: MaterialEquivalenceLike | null } {
  const label = materialLabel.toLowerCase();
  const g = Math.round(grammage);
  const active = rules.filter((r) => r.active !== false);

  // Match exact grammage d’abord (Offset 70 / 100)
  const exact = active.find((r) => {
    if (r.grammageMin !== g || (r.grammageMax != null && r.grammageMax !== g)) return false;
    if (r.materialKey === 'offset_70' || r.materialKey === 'offset_100') {
      return label.includes('offset') || label.includes('standard');
    }
    return false;
  });
  if (exact) {
    if (exact.identicalPrice) return { price: basePrice, applied: exact };
    return { price: Math.round(basePrice + exact.supplementAr), applied: exact };
  }

  const match = active.find((r) => {
    if (grammage < r.grammageMin) return false;
    if (r.grammageMax != null && grammage > r.grammageMax) return false;
    if (r.materialKey === 'offset_70' || r.materialKey === 'offset_100') return false;
    const key = r.materialLabel.toLowerCase();
    if (key.includes('90g') || key.includes('journal') || key.includes('autocopiant')) {
      return label.includes('standard') || label.includes('offset') || label.includes('journal') || label.includes('autocopiant');
    }
    if (key.includes('pcb') || key.includes('pcm') || key.includes('glossy')) {
      return /pcb|pcm|glossy/.test(label);
    }
    return label.includes(r.materialKey.replace(/_/g, ' '));
  });

  if (!match) return { price: basePrice, applied: null };
  if (match.identicalPrice) return { price: basePrice, applied: match };
  return { price: Math.round(basePrice + match.supplementAr), applied: match };
}

/**
 * Calcule prix papier épais à partir du prix 300G imprimé + vierge + collage.
 */
export function computeThickPaperPrice(input: {
  printed300Price: number;
  blankUnitPrice: number;
  collagePrice: number;
  rule: ThickPaperRuleLike;
}): { price: number; formula: string } {
  const { printed300Price, blankUnitPrice, collagePrice, rule } = input;
  if (rule.formula.includes('supplement') || (rule.grammageMax != null && rule.grammageMax <= 400)) {
    const price = Math.round(printed300Price + rule.supplementAr);
    return { price, formula: `${printed300Price}+${rule.supplementAr}` };
  }
  const blanks = rule.blankLayers * blankUnitPrice;
  const finish = rule.finishingRequired ? collagePrice : 0;
  const price = Math.round(printed300Price + blanks + finish);
  return {
    price,
    formula: `${printed300Price}+${rule.blankLayers}×vierge(${blankUnitPrice})+collage(${finish})`,
  };
}
