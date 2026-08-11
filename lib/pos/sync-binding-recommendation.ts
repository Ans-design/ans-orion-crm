import {
  articleUsesBindingEngine,
  evaluateBindingFromConfig,
  resolveBindingLabelFromConfig,
} from '@/lib/print/binding-rules';

/** Synchronise la référence technique recommandée dans la config (production / snapshot). */
export function syncBindingRecommendationInConfig(
  articleId: string,
  config: Record<string, unknown>,
): Record<string, unknown> {
  if (!articleUsesBindingEngine(articleId)) return config;

  const label = resolveBindingLabelFromConfig(config);
  if (!label || ['Sans reliure', 'Pelliculé', 'Pli simple'].includes(label)) {
    const { _bindingAutoReference: _, _bindingAutoLabel: __, ...rest } = config;
    return rest;
  }

  const ev = evaluateBindingFromConfig(config);
  if (!ev?.compatible || !ev.referenceLabel) return config;

  return {
    ...config,
    _bindingAutoReference: ev.reference ?? null,
    _bindingAutoLabel: ev.referenceLabel,
  };
}
