/**
 * Constructeur tarifaire visuel — blocs métier administrables.
 * L’expression générée documente le pipeline ; le moteur TS reste la source d’exécution.
 * Les blocs sont stockés dans FormulaVersion.variables.blocks (+ pipeline.blocks).
 */

export type PriceBlockKind =
  | 'base_fixed'
  | 'base_tier'
  | 'surface_m2'
  | 'surface_cm2'
  | 'material_cost'
  | 'option_modifiers'
  | 'finishing'
  | 'labor'
  | 'waste_percent'
  | 'margin_percent'
  | 'discount_percent'
  | 'surcharge_fixed'
  | 'minimum'
  | 'round_ar';

export type PriceBlock = {
  id: string;
  kind: PriceBlockKind;
  enabled: boolean;
  /** Valeur numérique (montant Ar, %, seuil…) selon le type */
  value?: number | null;
  label?: string;
};

export type PriceBlockDef = {
  kind: PriceBlockKind;
  label: string;
  description: string;
  valueLabel?: string;
  valueUnit?: string;
  defaultValue?: number | null;
  requiresValue?: boolean;
};

export const PRICE_BLOCK_CATALOG: readonly PriceBlockDef[] = [
  {
    kind: 'base_fixed',
    label: 'Prix de base fixe',
    description: 'Montant unitaire de départ (Ar)',
    valueLabel: 'Prix base',
    valueUnit: 'Ar',
    defaultValue: null,
    requiresValue: true,
  },
  {
    kind: 'base_tier',
    label: 'Prix selon paliers',
    description: 'Utilise les paliers quantité configurés',
  },
  {
    kind: 'surface_m2',
    label: 'Surface m²',
    description: 'Multiplie un prix m² par la surface facturable',
  },
  {
    kind: 'surface_cm2',
    label: 'Surface cm²',
    description: 'Multiplie un prix cm² (petit format / développé)',
  },
  {
    kind: 'material_cost',
    label: 'Coût matière',
    description: 'Applique les coûts matières liés au produit',
  },
  {
    kind: 'option_modifiers',
    label: 'Options / chips',
    description: 'Ajoute les modificateurs des options POS',
  },
  {
    kind: 'finishing',
    label: 'Finitions',
    description: 'Ajoute le coût des finitions sélectionnées',
  },
  {
    kind: 'labor',
    label: 'Main-d’œuvre',
    description: 'Supplément fixe de main-d’œuvre',
    valueLabel: 'Montant',
    valueUnit: 'Ar',
    defaultValue: 0,
    requiresValue: true,
  },
  {
    kind: 'waste_percent',
    label: 'Perte matière',
    description: 'Pourcentage de perte ajouté au coût',
    valueLabel: 'Perte',
    valueUnit: '%',
    defaultValue: 5,
    requiresValue: true,
  },
  {
    kind: 'margin_percent',
    label: 'Taux de marque',
    description: 'Coefficient sur coût (marque ≠ marge sur prix de vente)',
    valueLabel: 'Marque',
    valueUnit: '%',
    defaultValue: 25,
    requiresValue: true,
  },
  {
    kind: 'discount_percent',
    label: 'Remise',
    description: 'Remise globale transparente (hors paliers)',
    valueLabel: 'Remise',
    valueUnit: '%',
    defaultValue: 0,
    requiresValue: true,
  },
  {
    kind: 'surcharge_fixed',
    label: 'Supplément fixe',
    description: 'Montant ajouté une fois (ex. cliché)',
    valueLabel: 'Supplément',
    valueUnit: 'Ar',
    defaultValue: 0,
    requiresValue: true,
  },
  {
    kind: 'minimum',
    label: 'Minimum facturable',
    description: 'Plancher de prix (jamais un plafond)',
    valueLabel: 'Minimum',
    valueUnit: 'Ar',
    defaultValue: 0,
    requiresValue: true,
  },
  {
    kind: 'round_ar',
    label: 'Arrondi commercial',
    description: 'Arrondi supérieur aux N Ariary',
    valueLabel: 'Pas',
    valueUnit: 'Ar',
    defaultValue: 50,
    requiresValue: true,
  },
] as const;

const KIND_SET = new Set(PRICE_BLOCK_CATALOG.map((d) => d.kind));

export function catalogDef(kind: PriceBlockKind): PriceBlockDef {
  return PRICE_BLOCK_CATALOG.find((d) => d.kind === kind)!;
}

export function createBlock(kind: PriceBlockKind, partial?: Partial<PriceBlock>): PriceBlock {
  const def = catalogDef(kind);
  return {
    id: partial?.id ?? `blk_${kind}_${Math.random().toString(36).slice(2, 8)}`,
    kind,
    enabled: partial?.enabled ?? true,
    value: partial?.value !== undefined ? partial.value : (def.defaultValue ?? null),
    label: partial?.label ?? def.label,
  };
}

/** Pipeline par défaut — pièce / palier (non destructif, documentaire). */
export function defaultPieceBlocks(): PriceBlock[] {
  return [
    createBlock('base_tier'),
    createBlock('option_modifiers'),
    createBlock('finishing'),
    createBlock('surcharge_fixed', { value: 0 }),
    createBlock('minimum', { value: 0, enabled: false }),
    createBlock('round_ar', { value: 50 }),
  ];
}

export function defaultM2Blocks(): PriceBlock[] {
  return [
    createBlock('surface_m2'),
    createBlock('material_cost'),
    createBlock('option_modifiers'),
    createBlock('finishing'),
    createBlock('margin_percent', { value: 25 }),
    createBlock('minimum', { value: 0, enabled: false }),
    createBlock('round_ar', { value: 50 }),
  ];
}

export function blocksFromFormulaVariables(
  variables: unknown,
  calculationType?: string | null,
): PriceBlock[] {
  const root = (variables && typeof variables === 'object' ? variables : {}) as Record<string, unknown>;
  const raw = root.blocks ?? (root.pipeline as { blocks?: unknown } | undefined)?.blocks;
  if (Array.isArray(raw) && raw.length) {
    const parsed = raw
      .map((item, idx) => {
        if (!item || typeof item !== 'object') return null;
        const o = item as Record<string, unknown>;
        const kind = String(o.kind ?? '') as PriceBlockKind;
        if (!KIND_SET.has(kind)) return null;
        return createBlock(kind, {
          id: typeof o.id === 'string' ? o.id : `blk_${idx}`,
          enabled: o.enabled !== false,
          value: typeof o.value === 'number' ? o.value : o.value === null ? null : undefined,
          label: typeof o.label === 'string' ? o.label : undefined,
        });
      })
      .filter((b): b is PriceBlock => Boolean(b));
    if (parsed.length) return parsed;
  }
  const calc = (calculationType ?? 'piece').toLowerCase();
  if (calc === 'm2' || calc === 'laize') return defaultM2Blocks();
  if (calc === 'cm2' || calc === 'developpe') {
    return [
      createBlock('surface_cm2'),
      createBlock('option_modifiers'),
      createBlock('finishing'),
      createBlock('round_ar', { value: 50 }),
    ];
  }
  return defaultPieceBlocks();
}

function blockPhrase(block: PriceBlock): string {
  const def = catalogDef(block.kind);
  const v = block.value;
  switch (block.kind) {
    case 'base_fixed':
      return v != null && v > 0 ? `prix de base ${v} Ar` : 'prix de base fixe';
    case 'base_tier':
      return 'prix issu des paliers de quantité';
    case 'surface_m2':
      return 'coût selon la surface facturable (m²)';
    case 'surface_cm2':
      return 'coût selon la surface (cm²)';
    case 'material_cost':
      return 'coût matière lié';
    case 'option_modifiers':
      return 'suppléments des options sélectionnées';
    case 'finishing':
      return 'coût des finitions';
    case 'labor':
      return v != null && v > 0 ? `main-d’œuvre de ${v} Ar` : 'main-d’œuvre';
    case 'waste_percent':
      return v != null ? `perte matière de ${v} %` : 'perte matière';
    case 'margin_percent':
      return v != null ? `taux de marque de ${v} %` : 'taux de marque';
    case 'discount_percent':
      return v != null && v > 0 ? `remise de ${v} %` : 'remise';
    case 'surcharge_fixed':
      return v != null && v > 0 ? `supplément fixe de ${v} Ar` : 'supplément fixe';
    case 'minimum':
      return v != null && v > 0 ? `minimum facturable (plancher) ${v} Ar` : 'minimum facturable (plancher)';
    case 'round_ar':
      return v != null ? `arrondi aux ${v} Ar supérieurs` : 'arrondi commercial';
    default:
      return def.label;
  }
}

/** Phrase métier pour l’administrateur. */
export function blocksToNaturalLanguage(blocks: PriceBlock[]): string {
  const active = blocks.filter((b) => b.enabled);
  if (!active.length) return 'Aucun bloc tarifaire actif.';
  const parts = active.map(blockPhrase);
  if (parts.length === 1) return `Le prix est calculé avec : ${parts[0]}.`;
  const head = parts.slice(0, -1).join(', ');
  const last = parts[parts.length - 1];
  return `Prix = ${head}, puis ${last}.`;
}

/** Expression technique (documentaire, compatible historique). */
export function blocksToExpression(blocks: PriceBlock[]): string {
  const active = blocks.filter((b) => b.enabled);
  if (!active.length) return 'unit = prixBase';
  const parts: string[] = [];
  for (const b of active) {
    switch (b.kind) {
      case 'base_fixed':
        parts.push(b.value != null ? `base = ${b.value}` : 'base = prixBase');
        break;
      case 'base_tier':
        parts.push('base = tier(qty, priceTiers) || prixBase');
        break;
      case 'surface_m2':
        parts.push('unit = prixM2 × billable_m2(config)');
        break;
      case 'surface_cm2':
        parts.push('unit = prixCm2 × billable_cm2(config)');
        break;
      case 'material_cost':
        parts.push('unit += material_cost');
        break;
      case 'option_modifiers':
        parts.push('unit += sum(option_modifiers)');
        break;
      case 'finishing':
        parts.push('unit += finishing_cost');
        break;
      case 'labor':
        parts.push(b.value != null ? `unit += labor(${b.value})` : 'unit += labor');
        break;
      case 'waste_percent':
        parts.push(b.value != null ? `unit ×= (1 + waste%${b.value})` : 'unit ×= (1 + waste)');
        break;
      case 'margin_percent':
        // Marge sur prix de vente : unit = coût / (1 - taux) — JAMAIS coût × (1 + taux)
        parts.push(
          b.value != null
            ? `unit = coût / (1 - marge%${b.value})`
            : 'unit = coût / (1 - marge)',
        );
        break;
      case 'discount_percent':
        parts.push(b.value != null ? `unit ×= (1 - remise%${b.value})` : 'unit ×= (1 - remise)');
        break;
      case 'surcharge_fixed':
        parts.push(b.value != null && b.value > 0 ? `total += ${b.value}` : 'total += surcharge');
        break;
      case 'minimum':
        parts.push(b.value != null && b.value > 0 ? `total = max(total, ${b.value})` : 'total = max(total, minimum)');
        break;
      case 'round_ar':
        parts.push(b.value != null ? `round_up(${b.value} Ar)` : 'round_up(commercial)');
        break;
      default:
        break;
    }
  }
  if (!parts.some((p) => p.startsWith('unit') || p.startsWith('base'))) {
    parts.unshift('unit = base');
  } else if (parts[0]?.startsWith('base')) {
    parts.splice(1, 0, 'unit = base');
  }
  parts.push('totalHT = unit × qty');
  return parts.join(' → ');
}

export function validatePriceBlocks(blocks: PriceBlock[]): string | null {
  if (!blocks.length) return 'Ajoutez au moins un bloc tarifaire';
  const active = blocks.filter((b) => b.enabled);
  if (!active.length) return 'Activez au moins un bloc';
  for (const b of active) {
    const def = catalogDef(b.kind);
    // base_fixed sans valeur = prixBase du profil (référence dynamique)
    if (b.kind === 'base_fixed' && (b.value == null || b.value === 0)) continue;
    if (def.requiresValue && (b.value == null || !Number.isFinite(b.value) || b.value < 0)) {
      return `Valeur invalide pour « ${def.label} »`;
    }
    if (b.kind === 'waste_percent' || b.kind === 'discount_percent') {
      if (b.value != null && b.value > 100) return `Pourcentage trop élevé (${def.label})`;
    }
    if (b.kind === 'margin_percent') {
      if (b.value != null && (b.value <= 0 || b.value >= 100)) {
        return 'Marge cible doit être entre 0 exclus et 100 exclus (%)';
      }
    }
    if (b.kind === 'round_ar' && b.value != null && b.value < 1) {
      return 'Le pas d’arrondi doit être ≥ 1 Ar';
    }
  }
  const hasBase = active.some((b) =>
    b.kind === 'base_fixed' || b.kind === 'base_tier' || b.kind === 'surface_m2' || b.kind === 'surface_cm2',
  );
  if (!hasBase) return 'Ajoutez une base (fixe, paliers ou surface)';
  return null;
}

/**
 * Applique les blocs visuels sur un prix unitaire déjà calculé (ou 0).
 * Marge = coût / (1 - taux). Arrondi commercial au pas supérieur.
 */
export function applyPriceBlocksToUnit(
  blocks: PriceBlock[],
  ctx: {
    qty: number;
    prixBase: number;
    prixM2?: number | null;
    prixCm2?: number | null;
    surfaceM2?: number;
    surfaceCm2?: number;
    tierUnit?: number | null;
    materialCost?: number;
    optionModifiers?: number;
    finishingCost?: number;
  },
): { unit: number; total: number; trace: Array<{ kind: string; before: number; after: number; note?: string }> } {
  let unit = 0;
  let totalExtra = 0;
  const trace: Array<{ kind: string; before: number; after: number; note?: string }> = [];
  const active = blocks.filter((b) => b.enabled);

  for (const b of active) {
    const before = unit;
    switch (b.kind) {
      case 'base_fixed':
        unit = b.value != null && Number.isFinite(b.value) ? b.value : ctx.prixBase;
        break;
      case 'base_tier':
        unit = ctx.tierUnit != null && ctx.tierUnit > 0 ? ctx.tierUnit : ctx.prixBase;
        break;
      case 'surface_m2':
        unit = Math.round((ctx.prixM2 ?? 0) * (ctx.surfaceM2 ?? 0));
        break;
      case 'surface_cm2':
        unit = Math.round((ctx.prixCm2 ?? 0) * (ctx.surfaceCm2 ?? 0));
        break;
      case 'material_cost':
        unit += ctx.materialCost ?? 0;
        break;
      case 'option_modifiers':
        unit += ctx.optionModifiers ?? 0;
        break;
      case 'finishing':
        unit += ctx.finishingCost ?? 0;
        break;
      case 'labor':
        if (b.value != null) unit += b.value;
        break;
      case 'waste_percent': {
        const w = (b.value ?? 0) / 100;
        unit = Math.round(unit * (1 + w));
        break;
      }
      case 'margin_percent': {
        const rate = (b.value ?? 0) / 100;
        if (rate > 0 && rate < 1) {
          unit = Math.round(unit / (1 - rate));
        }
        break;
      }
      case 'discount_percent': {
        const d = (b.value ?? 0) / 100;
        unit = Math.round(unit * (1 - d));
        break;
      }
      case 'surcharge_fixed':
        if (b.value != null && b.value > 0) totalExtra += b.value;
        break;
      case 'minimum':
        // appliqué sur total plus bas
        break;
      case 'round_ar': {
        const step = b.value != null && b.value >= 1 ? b.value : 50;
        unit = Math.ceil(unit / step) * step;
        break;
      }
      default:
        break;
    }
    if (unit !== before || b.kind === 'surcharge_fixed' || b.kind === 'minimum') {
      trace.push({ kind: b.kind, before, after: unit, note: b.label });
    }
  }

  let total = Math.round(unit * Math.max(1, ctx.qty)) + totalExtra;
  const minBlock = active.find((b) => b.kind === 'minimum' && b.value != null && b.value > 0);
  if (minBlock?.value != null && total < minBlock.value) {
    trace.push({ kind: 'minimum', before: total, after: minBlock.value });
    total = minBlock.value;
  }

  return { unit: Math.max(0, Math.round(unit)), total: Math.max(0, Math.round(total)), trace };
}

export function buildFormulaVariablesPayload(
  blocks: PriceBlock[],
  calculationType?: string,
  extra?: { simpleFormula?: string; source?: string },
) {
  return {
    source: extra?.source ?? 'visual-price-builder',
    calculationType: calculationType ?? null,
    blocks,
    naturalLanguage: blocksToNaturalLanguage(blocks),
    ...(extra?.simpleFormula ? { simpleFormula: extra.simpleFormula } : {}),
  };
}
