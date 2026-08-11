import { describe, it, expect } from 'vitest';
import { buildDefaultAdminSnapshot } from '@/lib/admin-config/defaults';
import { computeCatalogDrift, mergeCatalogIntoDraft, reconcileCatalogDraft } from '@/lib/admin-config/catalog-drift';

describe('catalog-drift', () => {
  it('signale les chips manquantes quand le brouillon est vide', () => {
    const baseline = buildDefaultAdminSnapshot('published');
    const empty = { ...baseline, chips: {}, articles: {} };
    const drift = computeCatalogDrift(empty);
    expect(drift.missingChipIds.length).toBeGreaterThan(0);
    expect(drift.missingArticleIds.length).toBeGreaterThan(0);
    expect(drift.totalDrift).toBeGreaterThan(0);
  });

  it('mergeCatalogIntoDraft restaure les entrées catalogue', () => {
    const baseline = buildDefaultAdminSnapshot('published');
    const partial = { ...baseline, chips: {}, articles: {} };
    const merged = mergeCatalogIntoDraft(partial);
    expect(Object.keys(merged.chips).length).toBe(Object.keys(baseline.chips).length);
    expect(merged.variables.grammage_min_carte).toBeDefined();
  });

  it('reconcileCatalogDraft aligne les libellés catalogue', () => {
    const baseline = buildDefaultAdminSnapshot('published');
    const chipId = Object.keys(baseline.chips)[0];
    if (!chipId) return;
    const drifted = {
      ...baseline,
      status: 'draft' as const,
      chips: {
        ...baseline.chips,
        [chipId]: { ...baseline.chips[chipId]!, label: 'Libellé obsolète' },
      },
    };
    expect(computeCatalogDrift(drifted).labelMismatches.length).toBeGreaterThan(0);
    const fixed = reconcileCatalogDraft(drifted);
    expect(computeCatalogDrift(fixed).totalDrift).toBe(0);
  });
});
