import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import {
  shouldInjectPrintMaterialCatalog,
  usesNonPrintMaterials,
} from '@/lib/pos/print-material-policy';

describe('print material policy', () => {
  it('blocks print catalog for PLV, textile and goodies', () => {
    expect(usesNonPrintMaterials('plv-chevalet', 'plv')).toBe(true);
    expect(usesNonPrintMaterials('tx-tshirt', 'textile')).toBe(true);
    expect(usesNonPrintMaterials('gd-mug', 'goodies')).toBe(true);
    expect(shouldInjectPrintMaterialCatalog('plv-porte-affiches', 'plv')).toBe(false);
    expect(shouldInjectPrintMaterialCatalog('tx-tshirt', 'textile')).toBe(false);
  });

  it('allows print catalog only for paper print categories (hors flyers / cartes figés)', () => {
    expect(shouldInjectPrintMaterialCatalog('fly-std', 'flyers')).toBe(false);
    expect(shouldInjectPrintMaterialCatalog('cv-std', 'carterie')).toBe(false);
    expect(shouldInjectPrintMaterialCatalog('bk-livres', 'livres')).toBe(true);
    expect(shouldInjectPrintMaterialCatalog('evt-affiche', 'evenementiel')).toBe(false);
  });

  it('PLV chevalet exposes structure matiere and thickness', () => {
    const cfg = getProductConfig('plv-chevalet');
    const keys = cfg?.sections.flatMap((s) => s.fields.map((f) => f.key)) ?? [];
    expect(keys).toContain('matiere');
    expect(keys).toContain('epaisseur');
    const typeField = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'type');
    expect(typeField?.options).toEqual([
      'Chevalet de table',
      'Chevalet carton stop-rayon',
      'Chevalet PVC',
      'Chevalet personnalisé',
    ]);
  });

  it('PLV porte-flyers has no matiere; porte-affiches has structure matiere', () => {
    const flyersKeys = getProductConfig('plv-porte-flyers')?.sections.flatMap((s) => s.fields.map((f) => f.key)) ?? [];
    expect(flyersKeys).not.toContain('matiere');

    const affichesKeys = getProductConfig('plv-porte-affiches')?.sections.flatMap((s) => s.fields.map((f) => f.key)) ?? [];
    expect(affichesKeys).toContain('matiere');
    expect(affichesKeys).toContain('epaisseur');
  });

  it('PLV présentoir sol uses rigid supports not paper', () => {
    const matiere = getProductConfig('plv-presentoir-sol')?.sections
      .flatMap((s) => s.fields)
      .find((f) => f.key === 'matiere');
    expect(matiere?.options).not.toContain('Papier couché');
    expect(matiere?.options).toContain('Plexiglass');
  });

  it('PLV présentoir magasin has structure thickness', () => {
    const keys = getProductConfig('plv-presentoir-magasin')?.sections.flatMap((s) => s.fields.map((f) => f.key)) ?? [];
    expect(keys).toContain('epaisseur');
  });
});
