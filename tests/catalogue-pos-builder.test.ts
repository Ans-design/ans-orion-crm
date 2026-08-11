import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '@/lib/data/catalogue';
import {
  buildDatabasePrimaryPosItems,
  buildHybridPosItems,
  resolvePosCatalogueSource,
  type ProfileSnapshot,
} from '@/lib/services/catalogue-pos-builder';

const ctx = {
  familyToCategoryId: (family: string | null) => family || 'packaging',
  inferConfigType: (id: string) => CATALOGUE.find((a) => a.id === id)?.configType ?? 'finition',
  isVisibleInPos: () => true,
};

const sampleProfile = (overrides: Partial<ProfileSnapshot> = {}): ProfileSnapshot => ({
  articleId: 'pkg-boite',
  articleLabel: 'Boîte DB',
  family: 'packaging',
  prixBase: 1500,
  status: 'published',
  active: true,
  saleUnit: 'pièce',
  ...overrides,
});

describe('catalogue-pos-builder', () => {
  it('buildHybridPosItems garde les articles statiques sans profil', () => {
    const items = buildHybridPosItems([], {}, 'commercial', ctx);
    expect(items.length).toBeGreaterThan(90);
    // Sans profil DB : jamais priceSource database
    expect(items.every((i) => i.priceSource !== 'database')).toBe(true);
  });

  it('sans profil DB ne reprend pas prixDepart catalogue.ts (legacy OFF)', () => {
    const catPrice = CATALOGUE.find((a) => a.id === 'pkg-boite')?.prixDepart;
    expect(catPrice).toBeGreaterThan(0);
    const items = buildHybridPosItems([], {}, 'commercial', ctx);
    const boite = items.find((i) => i.id === 'pkg-boite');
    expect(boite?.prixDepart).toBeNull();
    expect(boite?.priceConfigured).toBe(false);
    expect(boite?.priceMissingReason).toMatch(/tarif|configur/i);
  });

  it('buildHybridPosItems enrichit un profil existant', () => {
    const items = buildHybridPosItems([sampleProfile()], {}, 'commercial', ctx);
    const boite = items.find((i) => i.id === 'pkg-boite');
    expect(boite?.name).toBe('Boîte DB');
    expect(boite?.priceSource).toBe('database');
    expect(boite?.prixDepart).toBe(1500);
  });

  it('buildDatabasePrimaryPosItems ignore brouillons et bascule hybride si couverture incomplète', () => {
    const items = buildDatabasePrimaryPosItems(
      [sampleProfile(), sampleProfile({ articleId: 'orphan-x', status: 'draft' })],
      {},
      'commercial',
      ctx,
    );
    expect(items.length).toBeGreaterThan(90);
    const boite = items.find((i) => i.id === 'pkg-boite');
    expect(boite?.priceSource).toBe('database');
    expect(boite?.prixDepart).toBe(1500);
    expect(items.find((i) => i.id === 'orphan-x')).toBeUndefined();
  });

  it('buildDatabasePrimaryPosItems n’expose que les profils publiés si couverture DB complète', () => {
    const fullProfiles = CATALOGUE.filter((a) => a.id !== 'imp-conception' && a.id !== 'cal-sousmain')
      .map((a) => sampleProfile({ articleId: a.id, articleLabel: a.name, prixBase: 1000 }));
    const items = buildDatabasePrimaryPosItems(fullProfiles, {}, 'commercial', ctx);
    expect(items.length).toBeGreaterThanOrEqual(93);
    expect(items.every((i) => i.priceSource === 'database')).toBe(true);
  });

  it('resolvePosCatalogueSource mappe les modes', () => {
    expect(resolvePosCatalogueSource('static-fallback')).toBe('catalogue-fallback');
    expect(resolvePosCatalogueSource('hybrid')).toBe('database');
    expect(resolvePosCatalogueSource('database-primary')).toBe('database-primary');
    expect(resolvePosCatalogueSource('database-full')).toBe('database-full');
  });

  it('privilégie prixBase DB même si une grille Excel existe pour l’article', () => {
    // fly-std a souvent une entrée Excel ; le profil DB doit gagner (legacy OFF par défaut).
    const items = buildHybridPosItems(
      [sampleProfile({ articleId: 'fly-std', articleLabel: 'Flyer DB', prixBase: 4242, family: 'flyers' })],
      {},
      'commercial',
      ctx,
    );
    const flyer = items.find((i) => i.id === 'fly-std');
    expect(flyer?.prixDepart).toBe(4242);
    expect(flyer?.priceSource).toBe('database');
  });
});
