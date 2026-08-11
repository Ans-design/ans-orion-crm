import type { ConfigField, ConfigSection, ProductConfig } from '@/lib/data/config-types';
import { DEFAULT_GLOBAL_PRICING, PRODUCTION_DELAYS } from '@/lib/data/global-pricing';
import { isGrandFormatArticleId } from '@/lib/grand-format/article-meta';
import { mergePriceImpactMetadata, resolveFieldPriceImpact } from '@/lib/pricing/price-impact-rules';

export type CalculationType = 'piece' | 'm2' | 'cm2' | 'formula' | 'laize' | 'developpe';

export interface ArticlePricingProfileSeed {
  articleId: string;
  articleLabel: string;
  family: string;
  calculationType: CalculationType;
  saleUnit: string;
  prixBase: number | null;
  prixM2: number | null;
  prixCm2: number | null;
  qtyMin: number | null;
}

export interface ProductOptionGroupSeed {
  fieldKey: string;
  label: string;
  sectionTitle: string;
  sectionIcon: string | null;
  fieldType: string;
  sortOrder: number;
  visiblePos: boolean;
  active: boolean;
  required: boolean;
  impactsPrice: boolean;
  impactsStock: boolean;
  impactsProduction: boolean;
  isInformational: boolean;
  requiresAdminValidation: boolean;
  metadata: Record<string, unknown> | null;
  values: ProductOptionValueSeed[];
}

export interface ProductOptionValueSeed {
  valueKey: string;
  label: string;
  sortOrder: number;
  priceModifier: number;
  modifierType: 'fixed' | 'multiplier' | 'm2' | 'piece';
  forcePrice: boolean;
  active: boolean;
  metadata: Record<string, unknown> | null;
}

export interface DiscountTierSeed {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
  discountPercent: number;
}

export interface UrgencyRuleSeed {
  label: string;
  surchargePercent: number;
  requiresValidation: boolean;
  sortOrder: number;
}

export interface StockRuleSeed {
  optionFieldKey: string | null;
  ruleType: string;
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
}

export interface MaterialPriceSeed {
  materialKey: string | null;
  grammage: string | null;
  prixM2: number | null;
  prixCm2: number | null;
  scope: 'article' | 'material';
  label: string | null;
}

export interface PricingVariableSeed {
  code: string;
  label: string;
  value: string;
  unit: string | null;
  valueType: 'number' | 'string' | 'boolean';
  scope: 'global' | 'article';
  articleId: string | null;
}

export interface FormulaVersionSeed {
  version: number;
  status: 'draft' | 'published' | 'archived';
  label: string;
  expression: string;
  variables: Record<string, unknown>;
}

export interface ArticleDynamicPricingSeed {
  profile: ArticlePricingProfileSeed;
  optionGroups: ProductOptionGroupSeed[];
  discountTiers: DiscountTierSeed[];
  urgencyRules: UrgencyRuleSeed[];
  materialPrices: MaterialPriceSeed[];
  stockRules: StockRuleSeed[];
  formula: FormulaVersionSeed;
}

const PRICE_IMPACT_FIELD_KEYS = new Set([
  'face',
  'finition',
  'finitions',
  'technique',
  'reliure',
  'type_reliure',
  'grammage',
  'format',
  'dim',
  'dimension',
  'matiere',
  'material',
  'support',
  'paperType',
  'volets',
  'qty',
  'quantite',
  'quantity',
  'type_impression',
]);

const STOCK_FIELD_KEYS = new Set([
  'matiere',
  'grammage',
  'couleur',
  'paperType',
  'paperWeight',
  'laize',
  'capacite',
  'coloris',
]);

const INFORMATIONAL_FIELD_KEYS = new Set([
  'remarques',
  'note',
  'notes',
  'fichier_joint',
  'zone_marquage',
  'precisions',
]);

export function toValueKey(label: string): string {
  const s = label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return s || 'value';
}

export function inferCalculationType(articleId: string, cfg: ProductConfig): CalculationType {
  if (cfg.prixCm2) return 'cm2';
  if (isGrandFormatArticleId(articleId)) return 'laize';
  if (cfg.prixM2 || articleId.startsWith('gf-')) return 'm2';
  if (articleId.startsWith('fin-') || articleId === 'imp-sf' || articleId.startsWith('bk-')) return 'formula';
  const hasLaize = cfg.sections.some((s) => s.fields.some((f) => f.key === 'laize'));
  if (hasLaize) return 'laize';
  const hasDeveloppe = cfg.sections.some((s) =>
    s.fields.some((f) => f.key === 'developpe' || f.customInput === 'dimension'),
  );
  if (hasDeveloppe && articleId.startsWith('pkg-')) return 'developpe';
  return 'piece';
}

export function buildFormulaExpression(articleId: string, cfg: ProductConfig): string {
  const calcType = inferCalculationType(articleId, cfg);
  const parts: string[] = [];
  if (calcType === 'm2' || calcType === 'laize') {
    parts.push('surface_m2 = billable_m2(config)');
    parts.push('unit = prixM2 × surface_m2');
  } else if (calcType === 'cm2' || calcType === 'developpe') {
    parts.push('surface_cm2 = billable_cm2(config)');
    parts.push('unit = prixCm2 × surface_cm2');
  } else {
    parts.push('base = tier(qty, priceTiers)');
    parts.push('unit = tier(qty, priceTiers) || prixBase');
  }
  parts.push('if face == "Recto-Verso" then unit × 1.8');
  parts.push('if finitions then unit × (1 + 0.12 × count(finitions))');
  parts.push('totalHT = unit × qty + clicheFee (once)');
  parts.push('if prix_force then unit = prix_force');
  return parts.join(' → ');
}

function fieldImpactsPrice(field: ConfigField): boolean {
  if (field.forcePriceValues?.length) return true;
  if (PRICE_IMPACT_FIELD_KEYS.has(field.key)) return true;
  if (field.type === 'chips' && field.customInput) return true;
  return false;
}

function fieldIsInformational(field: ConfigField): boolean {
  if (field.type === 'textarea') return true;
  if (INFORMATIONAL_FIELD_KEYS.has(field.key)) return true;
  if (field.type === 'color_palette' && !field.forcePriceValues?.length) return true;
  return false;
}

export function inferFieldPriceImpactDefaults(
  field: Pick<ConfigField, 'key' | 'type' | 'customInput' | 'forcePriceValues'>,
): { impactsPrice: boolean; isInformational: boolean } {
  return {
    impactsPrice: fieldImpactsPrice(field as ConfigField),
    isInformational: fieldIsInformational(field as ConfigField),
  };
}

function fieldImpactsStock(field: ConfigField): boolean {
  if (STOCK_FIELD_KEYS.has(field.key)) return true;
  if (field.key.includes('matiere') || field.key.includes('paper')) return true;
  return false;
}

function fieldVisiblePos(field: ConfigField, section: ConfigSection): boolean {
  if (field.archived || section.archived) return false;
  if (field.posHidden || section.posHidden) return false;
  return true;
}

function extractValuesFromField(field: ConfigField): ProductOptionValueSeed[] {
  const values: ProductOptionValueSeed[] = [];
  const forceSet = new Set(field.forcePriceValues ?? []);

  if (field.options?.length) {
    field.options.forEach((opt, i) => {
      values.push({
        valueKey: toValueKey(opt),
        label: opt,
        sortOrder: i,
        priceModifier: 0,
        modifierType: 'fixed',
        forcePrice: forceSet.has(opt),
        active: true,
        metadata: null,
      });
    });
  }

  if (field.palette?.length) {
    field.palette.forEach((entry, i) => {
      values.push({
        valueKey: entry.id || toValueKey(entry.label),
        label: entry.label,
        sortOrder: i,
        priceModifier: 0,
        modifierType: 'fixed',
        forcePrice: forceSet.has(entry.label) || forceSet.has('Personnalisée'),
        active: true,
        metadata: entry.hex ? { hex: entry.hex, badge: entry.badge ?? null } : null,
      });
    });
  }

  if (field.presets?.length && field.type === 'number') {
    field.presets.forEach((preset, i) => {
      values.push({
        valueKey: `preset-${preset}`,
        label: String(preset),
        sortOrder: i,
        priceModifier: 0,
        modifierType: 'piece',
        forcePrice: false,
        active: true,
        metadata: { preset: true },
      });
    });
  }

  return values;
}

export function extractOptionGroups(articleId: string, sections: ConfigSection[]): ProductOptionGroupSeed[] {
  const groups: ProductOptionGroupSeed[] = [];
  let sectionOrder = 0;

  for (const section of sections) {
    let fieldOrder = 0;
    for (const field of section.fields) {
      const visiblePos = fieldVisiblePos(field, section);
      const active = !field.archived && !section.archived;
      const fallbackIsInformational = fieldIsInformational(field);
      const fallbackImpactsPrice = fieldImpactsPrice(field);
      const impactsStock = fieldImpactsStock(field);
      const impactsProduction = visiblePos && !['qty', 'quantite'].includes(field.key);

      const metadata: Record<string, unknown> = {};
      if (field.showWhen) metadata.showWhen = field.showWhen;
      if (field.optionsFilter) metadata.optionsFilter = field.optionsFilter;
      if (field.paletteFilter) metadata.paletteFilter = field.paletteFilter;
      if (field.compatibility) metadata.compatibility = field.compatibility;
      if (field.customInput) metadata.customInput = field.customInput;
      if (field.forcePriceValues) metadata.forcePriceValues = field.forcePriceValues;
      const priceImpact = resolveFieldPriceImpact({
        articleId,
        fieldKey: field.key,
        defaultImpactsPrice: fallbackImpactsPrice,
        defaultIsInformational: fallbackIsInformational,
      });
      const finalMetadata = mergePriceImpactMetadata(metadata, priceImpact);

      groups.push({
        fieldKey: field.key,
        label: field.label,
        sectionTitle: section.title,
        sectionIcon: section.icon ?? null,
        fieldType: field.type,
        sortOrder: sectionOrder * 1000 + fieldOrder,
        visiblePos,
        active,
        required: field.required !== false && field.type !== 'textarea',
        impactsPrice: priceImpact.impactsPrice,
        impactsStock,
        impactsProduction,
        isInformational: priceImpact.isInformational,
        requiresAdminValidation: Boolean(field.forcePriceValues?.length),
        metadata: Object.keys(finalMetadata).length ? finalMetadata : null,
        values: extractValuesFromField(field),
      });
      fieldOrder++;
    }
    sectionOrder++;
  }

  return groups;
}

export function extractDiscountTiers(
  priceTiers: { max: number | null; px: number }[] | undefined,
  prixBase: number | null,
): DiscountTierSeed[] {
  if (!priceTiers?.length) return [];

  const sorted = [...priceTiers].sort((a, b) => {
    if (a.max === null) return 1;
    if (b.max === null) return -1;
    return a.max - b.max;
  });

  let prevMax = 0;
  return sorted.map((tier) => {
    const minQty = prevMax + 1;
    const maxQty = tier.max;
    prevMax = tier.max ?? prevMax;
    const discountPercent =
      prixBase && prixBase > 0 ? Math.max(0, Math.round((1 - tier.px / prixBase) * 1000) / 10) : 0;
    return {
      minQty,
      maxQty,
      unitPrice: tier.px,
      discountPercent,
    };
  });
}

export function extractUrgencyRules(globalPricing = DEFAULT_GLOBAL_PRICING): UrgencyRuleSeed[] {
  return PRODUCTION_DELAYS.map((delay, i) => {
    const multiplier = globalPricing.production[delay.multiplierKey];
    const surchargePercent = Math.round((multiplier - 1) * 1000) / 10;
    return {
      label: delay.label,
      surchargePercent,
      requiresValidation: delay.key !== 'standard',
      sortOrder: i,
    };
  });
}

const STOCK_MATERIAL_FIELDS = new Set([
  'matiere',
  'grammage',
  'matiere_int',
  'grammage_int',
  'matiere_couv',
  'grammage_couv',
  'paperType',
  'paperWeight',
  'type_bache',
  'laize',
]);

export function extractStockRules(
  articleId: string,
  calculationType: CalculationType,
  optionGroups: ProductOptionGroupSeed[],
): StockRuleSeed[] {
  const rules: StockRuleSeed[] = [];

  if (calculationType === 'cm2' || calculationType === 'developpe') {
    rules.push({
      optionFieldKey: null,
      ruleType: 'surface_consumption',
      condition: { unit: 'cm2', source: 'packaging_recap' },
      action: { consume: 'grossSurfaceCm2', multiplyBy: 'qty' },
    });
  } else if (calculationType === 'm2' || calculationType === 'laize') {
    rules.push({
      optionFieldKey: null,
      ruleType: 'surface_consumption',
      condition: {
        unit: 'm2',
        source: articleId.startsWith('gf-') || articleId === 'gf-bache' ? 'gf_billable' : 'surface_recap',
      },
      action: { consume: 'grossSurfaceM2', multiplyBy: 'qty' },
    });
  } else if (calculationType === 'formula') {
    rules.push({
      optionFieldKey: null,
      ruleType: 'formula_consumption',
      condition: { engine: 'family_material_recap' },
      action: { consume: 'grossSurfaceM2', multiplyBy: 'qty', fallbackUnit: 'piece' },
    });
  } else {
    rules.push({
      optionFieldKey: null,
      ruleType: 'piece_consumption',
      condition: {},
      action: { consume: 'qty', unit: 'piece' },
    });
  }

  for (const group of optionGroups) {
    if (!group.impactsStock && !STOCK_MATERIAL_FIELDS.has(group.fieldKey)) continue;
    if (!STOCK_MATERIAL_FIELDS.has(group.fieldKey) && group.fieldKey !== 'matiere' && !group.fieldKey.includes('matiere')) {
      if (!group.impactsStock) continue;
    }
    rules.push({
      optionFieldKey: group.fieldKey,
      ruleType: 'material_key',
      condition: { whenFieldSet: group.fieldKey },
      action: {
        resolveStock: 'catalog_material',
        paperTypeFields: ['matiere', 'matiere_int', 'matiere_couv', 'paperType', 'type_bache'],
        grammageFields: ['grammage', 'grammage_int', 'grammage_couv', 'paperWeight'],
      },
    });
  }

  return rules;
}

export function extractMaterialPrices(articleId: string, cfg: ProductConfig): MaterialPriceSeed[] {
  const prices: MaterialPriceSeed[] = [];
  if (cfg.prixM2) {
    prices.push({
      materialKey: null,
      grammage: null,
      prixM2: cfg.prixM2,
      prixCm2: null,
      scope: 'article',
      label: `Prix m² — ${articleId}`,
    });
  }
  if (cfg.prixCm2) {
    prices.push({
      materialKey: null,
      grammage: null,
      prixM2: null,
      prixCm2: cfg.prixCm2,
      scope: 'article',
      label: `Prix cm² — ${articleId}`,
    });
  }
  return prices;
}

export function extractGlobalPricingVariables(): PricingVariableSeed[] {
  const g = DEFAULT_GLOBAL_PRICING;
  const rows: PricingVariableSeed[] = [
    { code: 'tva_default', label: 'TVA par défaut (%)', value: String(g.tvaDefault), unit: '%', valueType: 'number', scope: 'global', articleId: null },
    { code: 'production_standard', label: 'Production standard (multiplicateur)', value: String(g.production.standard), unit: '×', valueType: 'number', scope: 'global', articleId: null },
    { code: 'production_express48h', label: 'Express 48 h (multiplicateur)', value: String(g.production.express48h), unit: '×', valueType: 'number', scope: 'global', articleId: null },
    { code: 'production_super24h', label: 'Super express 24 h (multiplicateur)', value: String(g.production.superExpress24h), unit: '×', valueType: 'number', scope: 'global', articleId: null },
    { code: 'bat_physique_papier', label: 'BAT physique papier (Ar)', value: String(g.bat.physiquePapier), unit: 'Ar', valueType: 'number', scope: 'global', articleId: null },
    { code: 'livraison_tana', label: 'Livraison Antananarivo (Ar)', value: String(g.livraison.livraisonTana), unit: 'Ar', valueType: 'number', scope: 'global', articleId: null },
    { code: 'livraison_province', label: 'Livraison province (Ar)', value: String(g.livraison.livraisonProvince), unit: 'Ar', valueType: 'number', scope: 'global', articleId: null },
    { code: 'face_recto_verso_mult', label: 'Multiplicateur Recto-Verso', value: '1.8', unit: '×', valueType: 'number', scope: 'global', articleId: null },
    { code: 'finition_surcharge_pct', label: 'Majoration finition (% par option)', value: '12', unit: '%', valueType: 'number', scope: 'global', articleId: null },
  ];
  return rows;
}

export function buildArticleDynamicPricingSeed(
  articleId: string,
  articleLabel: string,
  family: string,
  saleUnit: string,
  prixDepart: number | null,
  cfg: ProductConfig,
): ArticleDynamicPricingSeed {
  const prixBase = cfg.prixBase ?? prixDepart;
  const variables = {
    qty: 'Quantité officielle',
    priceTiers: cfg.priceTiers ?? [],
    prixBase,
    prixM2: cfg.prixM2 ?? null,
    prixCm2: cfg.prixCm2 ?? null,
    face: 'Recto / Recto-Verso (×1.8)',
    finitions: 'Majoration +12% par finition',
    clicheFee: cfg.hasCliche ? 'Frais cliché (une fois)' : null,
    prix_force: 'Prix unitaire forcé (droit admin)',
  };

  const optionGroups = extractOptionGroups(articleId, cfg.sections);
  const calculationType = inferCalculationType(articleId, cfg);

  return {
    profile: {
      articleId,
      articleLabel,
      family,
      calculationType,
      saleUnit,
      prixBase,
      prixM2: cfg.prixM2 ?? null,
      prixCm2: cfg.prixCm2 ?? null,
      qtyMin: cfg.qtyMin ?? null,
    },
    optionGroups,
    discountTiers: extractDiscountTiers(cfg.priceTiers, prixBase),
    urgencyRules: extractUrgencyRules(),
    materialPrices: extractMaterialPrices(articleId, cfg),
    stockRules: extractStockRules(articleId, calculationType, optionGroups),
    formula: {
      version: 1,
      status: 'draft',
      label: `Formule — ${articleLabel}`,
      expression: buildFormulaExpression(articleId, cfg),
      variables,
    },
  };
}
