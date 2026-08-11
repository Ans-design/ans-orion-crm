import { findCatalogueItem } from '@/lib/data/catalogue-meta';
import {
  VARIABLE_PRICE_IMPACT_RULES,
  type VariablePriceImpactKind,
  type VariablePriceImpactRule,
} from '@/lib/pos/variable-price-impact.config';
import { normalizeOptionFlags } from '@/lib/pricing/validate-discount-tiers';

type ManualImpactOverride = {
  impactsPrice: boolean;
  isInformational: boolean;
  updatedAt?: string;
};

export type PriceImpactStatus = {
  kind: VariablePriceImpactKind;
  impactsPrice: boolean;
  isInformational: boolean;
  badge: 'Impact prix' | 'Descriptif' | 'N’impacte pas le prix';
  reason: string;
  ruleId: string | null;
  source: 'default' | 'rule' | 'manual';
};

function normalizeFieldKey(fieldKey: string): string {
  return fieldKey.trim();
}

function readMetadataObject(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  return metadata as Record<string, unknown>;
}

export function readManualPriceImpactOverride(metadata: unknown): ManualImpactOverride | null {
  const meta = readMetadataObject(metadata);
  const raw = meta?.manualPriceImpactOverride;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const flags = normalizeOptionFlags({
    impactsPrice: Boolean((raw as ManualImpactOverride).impactsPrice),
    isInformational: Boolean((raw as ManualImpactOverride).isInformational),
  });
  return {
    ...flags,
    updatedAt: typeof (raw as ManualImpactOverride).updatedAt === 'string'
      ? (raw as ManualImpactOverride).updatedAt
      : undefined,
  };
}

export function writeManualPriceImpactOverride(
  metadata: unknown,
  flags: { impactsPrice: boolean; isInformational: boolean },
): Record<string, unknown> {
  const base = readMetadataObject(metadata) ?? {};
  const normalized = normalizeOptionFlags(flags);
  return {
    ...base,
    manualPriceImpactOverride: {
      ...normalized,
      updatedAt: new Date().toISOString(),
    },
  };
}

function matchesRule(rule: VariablePriceImpactRule, articleId: string, fieldKey: string): boolean {
  if (!rule.fieldKeys.includes(normalizeFieldKey(fieldKey))) return false;
  if (!rule.match) return true;

  const article = findCatalogueItem(articleId);
  const name = article?.name ?? '';
  const category = article?.category ?? '';
  const configType = article?.configType ?? '';

  const { articleIds, articleIdPrefixes, categories, configTypes, articleNameIncludes } = rule.match;
  if (articleIds?.includes(articleId)) return true;
  if (articleIdPrefixes?.some((prefix) => articleId.startsWith(prefix))) return true;
  if (categories?.includes(category)) return true;
  if (configTypes?.includes(configType)) return true;
  if (articleNameIncludes?.some((part) => name.toLowerCase().includes(part.toLowerCase()))) return true;
  return false;
}

export function getPriceImpactRule(articleId: string, fieldKey: string): VariablePriceImpactRule | null {
  return VARIABLE_PRICE_IMPACT_RULES.find((rule) => matchesRule(rule, articleId, fieldKey)) ?? null;
}

function toBadge(impactsPrice: boolean, isInformational: boolean): PriceImpactStatus['badge'] {
  if (impactsPrice) return 'Impact prix';
  if (isInformational) return 'Descriptif';
  return 'N’impacte pas le prix';
}

function toKind(impactsPrice: boolean, isInformational: boolean): VariablePriceImpactKind {
  if (!impactsPrice && isInformational) return 'descriptive';
  return 'pricing';
}

export function resolveFieldPriceImpact(params: {
  articleId: string;
  fieldKey: string;
  metadata?: unknown;
  defaultImpactsPrice?: boolean;
  defaultIsInformational?: boolean;
}): PriceImpactStatus {
  const flags = normalizeOptionFlags({
    impactsPrice: params.defaultImpactsPrice,
    isInformational: params.defaultIsInformational,
  });
  const manual = readManualPriceImpactOverride(params.metadata);
  if (manual) {
    const kind = toKind(manual.impactsPrice, manual.isInformational);
    return {
      kind,
      impactsPrice: manual.impactsPrice,
      isInformational: manual.isInformational,
      badge: toBadge(manual.impactsPrice, manual.isInformational),
      reason: 'Exception manuelle backoffice',
      ruleId: null,
      source: 'manual',
    };
  }

  const rule = getPriceImpactRule(params.articleId, params.fieldKey);
  if (rule) {
    const nextFlags = rule.kind === 'descriptive'
      ? { impactsPrice: false, isInformational: true }
      : { impactsPrice: true, isInformational: false };
    return {
      kind: rule.kind,
      impactsPrice: nextFlags.impactsPrice,
      isInformational: nextFlags.isInformational,
      badge: toBadge(nextFlags.impactsPrice, nextFlags.isInformational),
      reason: rule.reason,
      ruleId: rule.id,
      source: 'rule',
    };
  }

  const kind = toKind(flags.impactsPrice, flags.isInformational);
  return {
    kind,
    impactsPrice: flags.impactsPrice,
    isInformational: flags.isInformational,
    badge: toBadge(flags.impactsPrice, flags.isInformational),
    reason: flags.impactsPrice
      ? 'Variable tarifaire par défaut'
      : flags.isInformational
        ? 'Variable descriptive par défaut'
        : 'Visible sans impact prix',
    ruleId: null,
    source: 'default',
  };
}

export function mergePriceImpactMetadata(
  metadata: unknown,
  status: PriceImpactStatus,
): Record<string, unknown> {
  const base = readMetadataObject(metadata) ?? {};
  return {
    ...base,
    priceImpactRuleId: status.ruleId,
    priceImpactBadge: status.badge,
    priceImpactSource: status.source,
    priceImpactReason: status.reason,
  };
}
