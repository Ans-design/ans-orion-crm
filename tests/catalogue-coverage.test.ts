import { describe, expect, it } from 'vitest';
import { computeCatalogueDbCoverage } from '@/lib/services/catalogue-coverage';

describe('catalogue-coverage', () => {
  it('mode static-fallback sans profils DB', () => {
    const c = computeCatalogueDbCoverage(['a', 'b', 'c'], []);
    expect(c.mode).toBe('static-fallback');
    expect(c.coveragePercent).toBe(0);
    expect(c.missingInDb).toBe(3);
  });

  it('mode hybrid avec couverture partielle', () => {
    const c = computeCatalogueDbCoverage(['a', 'b', 'c', 'd'], ['a', 'b'], new Set());
    expect(c.mode).toBe('hybrid');
    expect(c.coveragePercent).toBe(50);
    expect(c.matched).toBe(2);
    expect(c.missingInDb).toBe(2);
  });

  it('mode database-full à 100% sans manquants', () => {
    const staticIds = ['a', 'b', 'c'];
    const c = computeCatalogueDbCoverage(staticIds, staticIds);
    expect(c.coveragePercent).toBe(100);
    expect(c.mode).toBe('database-full');
    expect(c.missingInDb).toBe(0);
  });

  it('mode database-primary à 95%+ avec profils orphelins', () => {
    const staticIds = Array.from({ length: 100 }, (_, i) => `art-${i}`);
    const dbIds = [...staticIds.slice(0, 96), 'orphan-1', 'orphan-2'];
    const c = computeCatalogueDbCoverage(staticIds, dbIds);
    expect(c.coveragePercent).toBe(96);
    expect(c.mode).toBe('database-primary');
    expect(c.orphanInDb).toBe(2);
  });

  it('exclut les articles masqués du dénominateur', () => {
    const hidden = new Set(['hidden']);
    const c = computeCatalogueDbCoverage(['visible', 'hidden'], ['visible'], hidden);
    expect(c.staticCount).toBe(1);
    expect(c.coveragePercent).toBe(100);
    expect(c.mode).toBe('database-full');
  });
});
