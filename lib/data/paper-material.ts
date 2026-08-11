/** Matière + grammage séparés — source unique POS / API */

import { grammageKeyForParent } from '@/lib/pos/grammage-field';
import { OFFICIAL_MATERIAL_COMPAT } from './material-compat-official';

/** Paires legacy matière / grammage — POS, panier, stock */
export const PAPER_LEGACY_PAIRS = [
  { matiereKey: 'matiere', typeKey: 'paperType', weightKey: 'paperWeight' },
  { matiereKey: 'matiere_int', typeKey: 'paperType_int', weightKey: 'paperWeight_int' },
  { matiereKey: 'matiere_couv', typeKey: 'paperType_couv', weightKey: 'paperWeight_couv' },
] as const;

export function isCustomMaterial(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v.includes('personnalis') || v.includes('sur devis') || v.includes('autre matière');
}

export type PaperOptionParsed = {
  paperType: string;
  paperWeight: string | null;
};

const COMBINED_PATTERN = /^(.+?)\s*(\d+)\s*g\s*$/i;
const TIGHT_NO_SPACE = /^(PCB|PCM|Offset|Bristol|Carton)(\d+)g?$/i;

/** Parse une chip legacy "PCM 170g" ou "PCB135g" */
export function parseLegacyPaper(raw: string): PaperOptionParsed {
  const s = raw.trim();
  if (!s) return { paperType: s, paperWeight: null };

  const lower = s.toLowerCase();
  if (lower.includes('personnalisée') || lower.includes('personnalisé')) {
    return { paperType: s, paperWeight: 'Grammage personnalisé' };
  }

  const tight = s.match(TIGHT_NO_SPACE);
  if (tight) {
    const type = tight[1].toUpperCase() === 'OFFSET' ? 'Offset' : tight[1].toUpperCase();
    return { paperType: type, paperWeight: `${tight[2]}g` };
  }

  const combined = s.match(COMBINED_PATTERN);
  if (combined) {
    let type = combined[1].trim();
    if (/^offset/i.test(type)) type = 'Offset';
    if (/^recyclé/i.test(type)) type = 'Papier recyclé';
    if (/^carton/i.test(type)) type = 'Carton';
    return { paperType: type, paperWeight: `${combined[2]}g` };
  }

  if (/^bristol$/i.test(s)) return { paperType: 'Bristol', paperWeight: '250g' };

  return { paperType: s, paperWeight: null };
}

/** Détecte si une option est une chip matière+grammage fusionnée */
export function isCombinedPaperOption(opt: string): boolean {
  if (!opt || opt.toLowerCase().includes('personnalisée')) return false;
  const s = opt.trim();
  if (TIGHT_NO_SPACE.test(s)) return true;
  if (/\d+\s*g/i.test(s)) return true;
  return false;
}

export function isCombinedPaperFieldKey(key: string): boolean {
  return key === 'matiere' || key === 'matiere_int' || key === 'matiere_couv';
}

export function paperTypeKeyFromMatiere(key: string): string {
  if (key === 'matiere_int') return 'paperType_int';
  if (key === 'matiere_couv') return 'paperType_couv';
  return 'paperType';
}

export function paperWeightKeyFromMatiere(key: string): string {
  if (key === 'matiere_int') return 'paperWeight_int';
  if (key === 'matiere_couv') return 'paperWeight_couv';
  return 'paperWeight';
}

/** Extrait types et grammages compatibles depuis options legacy combinées */
export function buildPaperSplitFromOptions(
  options: string[],
  defaultValue?: string,
): {
  types: string[];
  weightsByType: Record<string, string[]>;
  defaultType: string;
  defaultWeight: string;
} {
  const weightsByType: Record<string, Set<string>> = {};
  const typeOrder: string[] = [];

  for (const opt of options) {
    const { paperType, paperWeight } = parseLegacyPaper(opt);
    if (!typeOrder.includes(paperType)) typeOrder.push(paperType);
    if (!weightsByType[paperType]) weightsByType[paperType] = new Set();
    if (paperWeight) weightsByType[paperType].add(paperWeight);
    else if (paperType === 'Bristol') weightsByType[paperType].add('250g');
  }

  const weightsMap: Record<string, string[]> = {};
  for (const t of typeOrder) {
    weightsMap[t] = [...(weightsByType[t] || [])].sort((a, b) => parseInt(a) - parseInt(b));
  }

  const def = defaultValue
    ? parseLegacyPaper(defaultValue)
    : { paperType: typeOrder[0], paperWeight: weightsMap[typeOrder[0]]?.[0] ?? null };

  return {
    types: typeOrder,
    weightsByType: weightsMap,
    defaultType: def.paperType,
    defaultWeight: def.paperWeight || weightsMap[def.paperType]?.[0] || '',
  };
}

export const STANDARD_WEIGHTS_BY_TYPE: Record<string, string[]> = Object.fromEntries(
  OFFICIAL_MATERIAL_COMPAT.map((m) => [m.label, m.grammages]),
);

function resolveWeightsForType(
  paperType: string,
  weightsByType?: Record<string, string[]>,
): string[] | undefined {
  if (weightsByType?.[paperType]?.length) return weightsByType[paperType];
  if (STANDARD_WEIGHTS_BY_TYPE[paperType]?.length) return STANDARD_WEIGHTS_BY_TYPE[paperType];
  const norm = paperType.trim().toLowerCase();
  const official = OFFICIAL_MATERIAL_COMPAT.find(
    (m) => m.label.toLowerCase() === norm || m.key.toLowerCase() === norm,
  );
  return official?.grammages;
}

export function isPaperWeightCompatible(
  paperType: string,
  paperWeight: string,
  weightsByType?: Record<string, string[]>,
): boolean {
  if (!paperType || !paperWeight) return false;
  if (paperType.toLowerCase().includes('personnalisée')) return true;
  // Supports rigides carterie / PLV (PVC 1 mm, etc.)
  if (/\bmm\b/i.test(paperWeight) && /pvc|plexi|forex|rigide|carton/i.test(paperType)) return true;
  const preset = resolveWeightsForType(paperType, weightsByType);
  if (preset?.length) return preset.includes(paperWeight);
  return /^\d+g$/i.test(paperWeight) || paperWeight === 'Grammage personnalisé';
}

/** Normalise config client → paperType + paperWeight */
export function normalizePaperInConfig(config: Record<string, unknown>): {
  config: Record<string, unknown>;
  migrated: boolean;
} {
  const next = { ...config };
  let migrated = false;

  const pairs = PAPER_LEGACY_PAIRS;

  for (const { matiereKey, typeKey, weightKey } of pairs) {
    const legacy = next[matiereKey];
    // Ne migrer que les chips fusionnées « PCM 170g » — conserver matiere+grammage (carterie, flyers…)
    if (legacy && typeof legacy === 'string' && !next[typeKey] && isCombinedPaperOption(legacy)) {
      const p = parseLegacyPaper(legacy);
      next[typeKey] = p.paperType;
      if (p.paperWeight) next[weightKey] = p.paperWeight;
      delete next[matiereKey];
      migrated = true;
    }
  }

  if (typeof next.paper === 'string' && isCombinedPaperOption(next.paper)) {
    const p = parseLegacyPaper(next.paper);
    next.paperType = p.paperType;
    if (p.paperWeight) next.paperWeight = p.paperWeight;
    delete next.paper;
    migrated = true;
  }

  // Ne pas écraser grammage quand matiere est utilisée (config POS carterie / flyers)
  if (next.grammage && !next.paperWeight && !next.matiere) {
    next.paperWeight = next.grammage;
    delete next.grammage;
    migrated = true;
  }

  return { config: next, migrated };
}

export function validatePaperConfigStrict(config: Record<string, unknown>): { ok: boolean; error?: string } {
  for (const key of ['matiere', 'matiere_int', 'matiere_couv', 'paper']) {
    const v = config[key];
    if (typeof v === 'string' && isCombinedPaperOption(v)) {
      return { ok: false, error: `Configuration refusée : "${v}" — utilisez paperType + paperWeight` };
    }
  }

  for (const { typeKey, weightKey } of [
    { typeKey: 'paperType', weightKey: 'paperWeight' },
    { typeKey: 'paperType_int', weightKey: 'paperWeight_int' },
    { typeKey: 'paperType_couv', weightKey: 'paperWeight_couv' },
  ]) {
    const type = config[typeKey];
    const weight = config[weightKey];
    if (!type || !weight) continue;
    if (!isPaperWeightCompatible(String(type), String(weight))) {
      return { ok: false, error: `Grammage "${weight}" incompatible avec matière "${type}"` };
    }
  }

  for (const { typeKey, weightKey } of [
    { typeKey: 'matiere', weightKey: 'grammage' },
    { typeKey: 'matiere_int', weightKey: 'grammage_int' },
    { typeKey: 'matiere_couv', weightKey: 'grammage_couv' },
    { typeKey: 'famille_papier', weightKey: 'grammage_interieur' },
    { typeKey: 'type_support_couverture', weightKey: 'grammage_couverture' },
  ]) {
    const type = config[typeKey];
    const weight = config[weightKey];
    if (!type || !weight) continue;
    if (!isPaperWeightCompatible(String(type), String(weight))) {
      return { ok: false, error: `Grammage "${weight}" incompatible avec matière "${type}"` };
    }
  }
  return { ok: true };
}

export function resetPaperWeightIfNeeded(
  config: Record<string, unknown>,
  changedTypeKey: string,
  weightsByType?: Record<string, string[]>,
): Record<string, unknown> {
  if (changedTypeKey.startsWith('paperType')) {
    const suffix = changedTypeKey.replace('paperType', '');
    const weightKey = `paperWeight${suffix}`;
    const type = String(config[changedTypeKey] ?? '');
    const weight = String(config[weightKey] ?? '');
    if (!type) {
      return { ...config, [weightKey]: '' };
    }
    if (!weight) return config;
    if (!isPaperWeightCompatible(type, weight, weightsByType)) {
      return { ...config, [weightKey]: '' };
    }
    return config;
  }

  if (changedTypeKey.startsWith('matiere') || changedTypeKey === 'famille_papier' || changedTypeKey === 'type_support_couverture') {
    const weightKey = grammageKeyForParent(changedTypeKey);
    if (!weightKey) return config;

    const type = String(config[changedTypeKey] ?? '');
    const weight = String(config[weightKey] ?? '');

    if (!type) {
      return { ...config, [weightKey]: '' };
    }
    if (!weight) return config;
    if (!isPaperWeightCompatible(type, weight, weightsByType)) {
      return { ...config, [weightKey]: '' };
    }
  }

  return config;
}
