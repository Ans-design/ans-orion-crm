import { describe, expect, it } from 'vitest';
import {
  computeCatalogueHealth,
  parseCatalogueStudioTab,
  DEFAULT_CATALOGUE_STUDIO_TAB,
} from '@/lib/administration/catalogue-pos-studio';

describe('catalogue-pos-studio', () => {
  it('parse studio tab avec défaut chips', () => {
    expect(parseCatalogueStudioTab(null)).toBe(DEFAULT_CATALOGUE_STUDIO_TAB);
    expect(parseCatalogueStudioTab('variables')).toBe('variables');
    expect(parseCatalogueStudioTab('invalid')).toBe('chips');
    expect(parseCatalogueStudioTab('mockup')).toBe('chips');
    expect(parseCatalogueStudioTab('pos')).toBe('chips');
    expect(parseCatalogueStudioTab('infos')).toBe('chips');
  });

  it('calcule la santé article', () => {
    const ok = computeCatalogueHealth({
      variableCount: 5,
      activeCount: 4,
      priceImpactCount: 2,
      anomalyCount: 0,
      materialsCount: 1,
    });
    expect(ok.readyToPublish).toBe(true);

    const bad = computeCatalogueHealth({
      variableCount: 0,
      activeCount: 0,
      priceImpactCount: 0,
      anomalyCount: 3,
    });
    expect(bad.hasAnomalies).toBe(true);
    expect(bad.readyToPublish).toBe(false);
  });
});
