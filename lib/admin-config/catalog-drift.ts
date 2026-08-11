import { buildDefaultAdminSnapshot } from '@/lib/admin-config/defaults';
import type { AdminConfigSnapshot } from '@/lib/admin-config/types';

export type CatalogDriftReport = {
  missingChipIds: string[];
  extraCatalogChipIds: string[];
  missingArticleIds: string[];
  labelMismatches: string[];
  totalDrift: number;
  details: string[];
};

/** Compare la config admin avec le catalogue code (config-types). */
export function computeCatalogDrift(snapshot: AdminConfigSnapshot): CatalogDriftReport {
  const baseline = buildDefaultAdminSnapshot('published');
  const missingChipIds = Object.keys(baseline.chips).filter((id) => !snapshot.chips[id]);
  const extraCatalogChipIds = Object.keys(snapshot.chips).filter(
    (id) => !baseline.chips[id] && snapshot.chips[id]?.source === 'catalogue',
  );
  const missingArticleIds = Object.keys(baseline.articles).filter((id) => !snapshot.articles[id]);

  const labelMismatches: string[] = [];
  for (const [id, chip] of Object.entries(baseline.chips)) {
    const current = snapshot.chips[id];
    if (current && current.label !== chip.label && !current.archived) {
      labelMismatches.push(`${id}: « ${current.label} » ≠ « ${chip.label} »`);
    }
  }

  const details: string[] = [];
  if (missingChipIds.length) {
    details.push(`${missingChipIds.length} chip(s) catalogue absentes de l'admin`);
  }
  if (missingArticleIds.length) {
    details.push(`${missingArticleIds.length} article(s) catalogue absents de l'admin`);
  }
  if (labelMismatches.length) {
    details.push(`${labelMismatches.length} libellé(s) chip divergent(s)`);
  }

  return {
    missingChipIds,
    extraCatalogChipIds,
    missingArticleIds,
    labelMismatches,
    totalDrift: missingChipIds.length + missingArticleIds.length + labelMismatches.length,
    details,
  };
}

/** Fusionne les entrées catalogue manquantes dans le brouillon (sans écraser l'existant). */
export function mergeCatalogIntoDraft(draft: AdminConfigSnapshot): AdminConfigSnapshot {
  const baseline = buildDefaultAdminSnapshot('published');
  const chips = { ...draft.chips };
  for (const [id, chip] of Object.entries(baseline.chips)) {
    if (!chips[id]) chips[id] = chip;
  }
  const articles = { ...draft.articles };
  for (const [id, art] of Object.entries(baseline.articles)) {
    if (!articles[id]) articles[id] = art;
  }
  const productPreviews = { ...(draft.productPreviews ?? {}) };
  for (const [id, preview] of Object.entries(baseline.productPreviews ?? {})) {
    if (!productPreviews[id]) productPreviews[id] = preview;
  }
  const variables = { ...draft.variables };
  for (const [key, v] of Object.entries(baseline.variables)) {
    if (!variables[key]) variables[key] = v;
  }
  return { ...draft, chips, articles, productPreviews, variables };
}

/**
 * Aligne le brouillon admin sur le catalogue code : entrées manquantes + libellés catalogue.
 * Préserve les surcharges hors source catalogue (visibilité, prix custom).
 */
export function reconcileCatalogDraft(draft: AdminConfigSnapshot): AdminConfigSnapshot {
  const merged = mergeCatalogIntoDraft(draft);
  const baseline = buildDefaultAdminSnapshot('published');

  const chips = { ...merged.chips };
  for (const [id, baseChip] of Object.entries(baseline.chips)) {
    const current = chips[id];
    if (!current) {
      chips[id] = baseChip;
      continue;
    }
    const fromCatalogue = baseChip.source === 'catalogue' || current.source === 'catalogue' || !current.source;
    if (!fromCatalogue) continue;
    chips[id] = {
      ...current,
      label: baseChip.label,
      blockKey: baseChip.blockKey,
      fieldKey: baseChip.fieldKey,
      optionKey: baseChip.optionKey,
      order: baseChip.order,
      source: 'catalogue',
      archived: baseChip.archived ?? current.archived,
      visibility: current.archived || baseChip.archived ? current.visibility : current.visibility,
      priceImpact: current.priceImpact,
      defaultSelected: baseChip.defaultSelected ?? current.defaultSelected,
    };
  }

  const articles = { ...merged.articles };
  for (const [id, baseArt] of Object.entries(baseline.articles)) {
    const current = articles[id];
    if (!current) {
      articles[id] = baseArt;
      continue;
    }
    articles[id] = {
      ...current,
      name: baseArt.name,
      category: baseArt.category,
    };
  }

  const productPreviews = { ...(merged.productPreviews ?? {}) };
  for (const [id, preview] of Object.entries(baseline.productPreviews ?? {})) {
    if (!productPreviews[id]) productPreviews[id] = preview;
  }

  return { ...merged, chips, articles, productPreviews };
}
