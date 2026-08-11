/**
 * Formule simple Admin — variables + opérateurs (+, ×).
 * Convertie en PriceBlock[] pour exécution POS (applyPriceBlocksToUnit).
 * Pas de conditions / if / then / unit — syntaxe métier lisible.
 */

import {
  createBlock,
  type PriceBlock,
  type PriceBlockKind,
} from '@/lib/pricing/price-builder-blocks';

export type SimpleFormulaToken = {
  code: string;
  label: string;
  /** Texte inséré dans l’éditeur (ex. marge%25). */
  insert: string;
  hint?: string;
};

/** Jetons proposés dans l’UI (clic → insertion). */
export const SIMPLE_FORMULA_TOKENS: readonly SimpleFormulaToken[] = [
  { code: 'prixBase', label: 'Prix base', insert: 'prixBase', hint: 'Prix de référence article' },
  { code: 'paliers', label: 'Paliers', insert: 'paliers', hint: 'Prix selon quantité' },
  { code: 'surface_m2', label: 'Surface m²', insert: 'surface_m2', hint: 'prixM2 × surface' },
  { code: 'surface_cm2', label: 'Surface cm²', insert: 'surface_cm2', hint: 'prixCm2 × surface' },
  { code: 'matiere', label: 'Matière', insert: 'matiere', hint: 'Coût matière' },
  { code: 'options', label: 'Options', insert: 'options', hint: 'Suppléments options POS' },
  { code: 'finitions', label: 'Finitions', insert: 'finitions', hint: 'Coût finitions' },
  { code: 'main_oeuvre', label: 'Main-d’œuvre', insert: 'main_oeuvre(0)', hint: 'Montant fixe Ar' },
  { code: 'perte', label: 'Perte %', insert: 'perte%5', hint: 'Perte matière' },
  { code: 'marge', label: 'Marge %', insert: 'marge%25', hint: 'Taux de marque' },
  { code: 'remise', label: 'Remise %', insert: 'remise%0', hint: 'Remise globale' },
  { code: 'supplement', label: 'Supplément', insert: 'supplement(0)', hint: 'Montant fixe Ar' },
  { code: 'minimum', label: 'Minimum', insert: 'minimum(0)', hint: 'Plancher Ar' },
  { code: 'arrondi', label: 'Arrondi', insert: 'arrondi(50)', hint: 'Arrondi supérieur Ar' },
] as const;

export type SimpleFormulaParseOk = {
  ok: true;
  blocks: PriceBlock[];
  normalized: string;
};

export type SimpleFormulaParseErr = {
  ok: false;
  error: string;
};

export type SimpleFormulaParseResult = SimpleFormulaParseOk | SimpleFormulaParseErr;

const KIND_BY_VAR: Record<string, PriceBlockKind> = {
  prixbase: 'base_fixed',
  prix_base: 'base_fixed',
  base: 'base_fixed',
  paliers: 'base_tier',
  tier: 'base_tier',
  palier: 'base_tier',
  surface_m2: 'surface_m2',
  surfacem2: 'surface_m2',
  m2: 'surface_m2',
  surface_cm2: 'surface_cm2',
  surfacecm2: 'surface_cm2',
  cm2: 'surface_cm2',
  matiere: 'material_cost',
  matière: 'material_cost',
  material: 'material_cost',
  options: 'option_modifiers',
  option: 'option_modifiers',
  chips: 'option_modifiers',
  finitions: 'finishing',
  finition: 'finishing',
  main_oeuvre: 'labor',
  maindoeuvre: 'labor',
  labor: 'labor',
  perte: 'waste_percent',
  waste: 'waste_percent',
  marge: 'margin_percent',
  margin: 'margin_percent',
  remise: 'discount_percent',
  discount: 'discount_percent',
  supplement: 'surcharge_fixed',
  surcharge: 'surcharge_fixed',
  minimum: 'minimum',
  min: 'minimum',
  arrondi: 'round_ar',
  round: 'round_ar',
};

function stripAssignment(raw: string): string {
  let s = raw.trim();
  // prix = … | base = … | unit = … | total = …
  s = s.replace(/^(prix|base|unit|total|totalht|formule)\s*=\s*/i, '');
  return s.trim();
}

function normalizeOps(raw: string): string {
  return raw
    .replace(/→/g, '+')
    .replace(/->/g, '+')
    .replace(/×/g, '*')
    // « x » opérateur seul (espaces autour), pas le x de prixBase
    .replace(/(?<=^|[\s+*(])x(?=[\s+*)]|$)/gi, '*')
    .replace(/\s+/g, ' ')
    .trim();
}

type ParsedTerm = {
  kind: PriceBlockKind;
  value?: number | null;
  label?: string;
};

function parseTerm(raw: string): ParsedTerm | { error: string } {
  const t = raw.trim();
  if (!t) return { error: 'Terme vide' };

  // nombre seul → prix de base fixe
  if (/^\d+([.,]\d+)?$/.test(t)) {
    const n = Number(t.replace(',', '.'));
    return { kind: 'base_fixed', value: n, label: 'Prix de base fixe' };
  }

  const normKey = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, '_');

  // var%N  (marge%25, perte%5, remise%10)
  const pct = t.match(/^([a-zA-Zàâäéèêëïîôùûüç_]+)\s*%\s*(\d+(?:[.,]\d+)?)$/i);
  if (pct) {
    const key = normKey(pct[1]!);
    const n = Number(pct[2]!.replace(',', '.'));
    const kind = KIND_BY_VAR[key];
    if (!kind || !['waste_percent', 'margin_percent', 'discount_percent'].includes(kind)) {
      return { error: `Variable « ${pct[1]} » n’accepte pas %` };
    }
    return { kind, value: n };
  }

  // var(N)  (main_oeuvre(500), supplement(1000), arrondi(50), minimum(2000))
  const call = t.match(/^([a-zA-Zàâäéèêëïîôùûüç_]+)\s*\(\s*(\d+(?:[.,]\d+)?)\s*\)$/i);
  if (call) {
    const key = normKey(call[1]!);
    const n = Number(call[2]!.replace(',', '.'));
    const kind = KIND_BY_VAR[key] ?? (key === 'prix_base' ? 'base_fixed' : undefined);
    if (!kind) return { error: `Variable inconnue « ${call[1]} »` };
    return { kind, value: n };
  }

  const key = normKey(t);
  if (key === 'prixbase' || key === 'prix_base') {
    return { kind: 'base_fixed', value: null, label: 'Prix de base' };
  }
  const kind = KIND_BY_VAR[key];
  if (!kind) return { error: `Variable inconnue « ${t} ». Utilisez les jetons proposés.` };
  return { kind, value: undefined };
}

/**
 * Parse une formule simple → blocs POS.
 * Ex. `prixBase + options + finitions + marge%25 + arrondi(50)`
 */
export function parseSimpleFormula(input: string): SimpleFormulaParseResult {
  const stripped = stripAssignment(String(input ?? ''));
  if (!stripped) {
    return { ok: false, error: 'Formule vide — ajoutez au moins une variable (ex. prixBase)' };
  }

  // Rejeter l’ancien DSL conditionnel
  if (/\bthen\b|\bif\b|==|unit\s*[×x*]=/i.test(stripped)) {
    return {
      ok: false,
      error:
        'Formule trop complexe. Utilisez uniquement variables et opérateurs (+, ×), ex. prixBase + options + marge%25',
    };
  }

  const normalized = normalizeOps(stripped);
  const terms = normalized
    .split(/\s*[+*]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (!terms.length) {
    return { ok: false, error: 'Aucun terme reconnu' };
  }

  const blocks: PriceBlock[] = [];
  const seenBase = { fixed: false, tier: false, surface: false };

  for (const term of terms) {
    const parsed = parseTerm(term);
    if ('error' in parsed) return { ok: false, error: parsed.error };

    const { kind, value, label } = parsed;
    if (kind === 'base_fixed') seenBase.fixed = true;
    if (kind === 'base_tier') seenBase.tier = true;
    if (kind === 'surface_m2' || kind === 'surface_cm2') seenBase.surface = true;

    blocks.push(
      createBlock(kind, {
        enabled: true,
        value: value === undefined ? undefined : value,
        label,
      }),
    );
  }

  if (!seenBase.fixed && !seenBase.tier && !seenBase.surface) {
    return {
      ok: false,
      error: 'Ajoutez une base : prixBase, paliers, surface_m2 ou surface_cm2',
    };
  }

  const display = blocksToSimpleFormula(blocks);
  return { ok: true, blocks, normalized: display };
}

/** Sérialise les blocs actifs en formule simple lisible. */
export function blocksToSimpleFormula(blocks: PriceBlock[]): string {
  const active = blocks.filter((b) => b.enabled);
  if (!active.length) return 'prixBase';

  const parts: string[] = [];
  for (const b of active) {
    switch (b.kind) {
      case 'base_fixed':
        parts.push(b.value != null && b.value > 0 ? String(b.value) : 'prixBase');
        break;
      case 'base_tier':
        parts.push('paliers');
        break;
      case 'surface_m2':
        parts.push('surface_m2');
        break;
      case 'surface_cm2':
        parts.push('surface_cm2');
        break;
      case 'material_cost':
        parts.push('matiere');
        break;
      case 'option_modifiers':
        parts.push('options');
        break;
      case 'finishing':
        parts.push('finitions');
        break;
      case 'labor':
        parts.push(`main_oeuvre(${b.value ?? 0})`);
        break;
      case 'waste_percent':
        parts.push(`perte%${b.value ?? 0}`);
        break;
      case 'margin_percent':
        parts.push(`marge%${b.value ?? 0}`);
        break;
      case 'discount_percent':
        parts.push(`remise%${b.value ?? 0}`);
        break;
      case 'surcharge_fixed':
        parts.push(`supplement(${b.value ?? 0})`);
        break;
      case 'minimum':
        if (b.value != null && b.value > 0) parts.push(`minimum(${b.value})`);
        break;
      case 'round_ar':
        parts.push(`arrondi(${b.value ?? 50})`);
        break;
      default:
        break;
    }
  }
  return parts.join(' + ');
}

/**
 * Initialise la formule simple affichée :
 * 1) variables.simpleFormula si présent
 * 2) sinon dérivée des blocs
 * 3) sinon défaut selon type de calcul
 */
export function resolveSimpleFormulaDraft(
  variables: unknown,
  calculationType?: string | null,
  blocks?: PriceBlock[],
): string {
  const root =
    variables && typeof variables === 'object' && !Array.isArray(variables)
      ? (variables as Record<string, unknown>)
      : {};
  if (typeof root.simpleFormula === 'string' && root.simpleFormula.trim()) {
    return root.simpleFormula.trim();
  }
  if (blocks?.length) return blocksToSimpleFormula(blocks);
  const calc = (calculationType ?? 'piece').toLowerCase();
  if (calc === 'm2' || calc === 'laize') {
    return 'surface_m2 + matiere + options + finitions + marge%25 + arrondi(50)';
  }
  if (calc === 'cm2' || calc === 'developpe') {
    return 'surface_cm2 + options + finitions + arrondi(50)';
  }
  return 'prixBase + options + finitions + arrondi(50)';
}

/** Extrait simpleFormula depuis variables (pour round-trip). */
export function readStoredSimpleFormula(variables: unknown): string | null {
  const root =
    variables && typeof variables === 'object' && !Array.isArray(variables)
      ? (variables as Record<string, unknown>)
      : {};
  return typeof root.simpleFormula === 'string' && root.simpleFormula.trim()
    ? root.simpleFormula.trim()
    : null;
}
