import { describe, expect, it } from 'vitest';
import {
  resolvePricingStudioSection,
  PRICING_STUDIO_SECTIONS,
  PRICING_STUDIO_SECTIONS_VISIBLE,
} from '@/components/admin/catalogue-prix-stock/PricingStudioNav';

describe('resolvePricingStudioSection — refonte 3 piliers (nav sections masquées)', () => {
  it('n’affiche plus aucune section dans PricingStudioNav (DOMAINES portent la nav)', () => {
    expect(PRICING_STUDIO_SECTIONS_VISIBLE).toEqual([]);
    const allIds = PRICING_STUDIO_SECTIONS.map((s) => s.id);
    expect(allIds).toContain('overview');
    expect(allIds).toContain('anomalies');
    expect(allIds).toContain('engines');
    expect(allIds).toContain('formulas');
    expect(allIds).toContain('tiers');
    expect(allIds).toContain('dependencies');
  });

  it('redirige simulation, versions, overview et anomalies vers articles', () => {
    expect(resolvePricingStudioSection('simulation')).toBe('articles');
    expect(resolvePricingStudioSection('sim')).toBe('articles');
    expect(resolvePricingStudioSection('simulateur')).toBe('articles');
    expect(resolvePricingStudioSection('versions')).toBe('articles');
    expect(resolvePricingStudioSection('version')).toBe('articles');
    expect(resolvePricingStudioSection('overview')).toBe('articles');
    expect(resolvePricingStudioSection('vue')).toBe('articles');
    expect(resolvePricingStudioSection('sante')).toBe('articles');
    expect(resolvePricingStudioSection('anomalies')).toBe('articles');
  });

  it('conserve le mapping métier pour deep-links', () => {
    expect(resolvePricingStudioSection('regles')).toBe('formulas');
    expect(resolvePricingStudioSection('paliers')).toBe('tiers');
    expect(resolvePricingStudioSection('engines')).toBe('engines');
  });

  it('mappe options & dépendances vers la vue dédiée', () => {
    expect(resolvePricingStudioSection('dependencies')).toBe('dependencies');
    expect(resolvePricingStudioSection('options')).toBe('dependencies');
  });

  it('défaut = Tarifs par article (entrée opérationnelle)', () => {
    expect(resolvePricingStudioSection(null)).toBe('articles');
    expect(resolvePricingStudioSection('')).toBe('articles');
    expect(resolvePricingStudioSection('inconnu')).toBe('articles');
  });
});
