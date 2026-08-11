import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import { filterProductConfigForPos } from '@/lib/pos/filter-pos-config';
import { CATALOGUE } from '@/lib/data/catalogue';
import {
  applyAutocopiantColorRules,
  formatAutocopiantColorProgress,
  resolveAutocopiantColorCount,
} from '@/lib/pos/autocopiant-policy';
import {
  autocopiantLegacyPrefill,
  autocopiantLegacyRedirectTarget,
  resolveAutocopiantCanonicalId,
} from '@/lib/pos/autocopiant-catalog';

function fieldOptions(articleId: string, fieldKey: string): string[] {
  const cfg = filterProductConfigForPos(getProductConfig(articleId));
  for (const section of cfg?.sections ?? []) {
    const field = section.fields.find((f) => f.key === fieldKey);
    if (field?.options) return field.options;
  }
  return [];
}

function sectionTitles(articleId: string): string[] {
  const cfg = filterProductConfigForPos(getProductConfig(articleId));
  return cfg?.sections.map((s) => s.title) ?? [];
}

describe('carnet autocopiant / facturier', () => {
  it('couleurs souches — duplicopie 1, triplicopie 2, quadruplicopie 3', () => {
    expect(resolveAutocopiantColorCount({ duplicopie: 'Duplicopie (2 copies)' })).toBe(1);
    expect(resolveAutocopiantColorCount({ duplicopie: 'Triplicopie (3 copies)' })).toBe(2);
    expect(resolveAutocopiantColorCount({ duplicopie: 'Quadruplicopie (4 copies)' })).toBe(3);
  });

  it('nombre personnalisé >4 — couleurs = copies - 1', () => {
    expect(resolveAutocopiantColorCount({
      duplicopie: 'Autre nombre personnalisé (>4)',
      nb_copies: 6,
    })).toBe(5);
  });

  it('trimme les couleurs si passage triplicopie → duplicopie', () => {
    const next = applyAutocopiantColorRules({
      duplicopie: 'Duplicopie (2 copies)',
      couleurs_souches: ['Jaune', 'Rose'],
    });
    expect(next.couleurs_souches).toEqual(['Jaune']);
  });

  it('section Duplicopie (pas Exemplaires), format A6', () => {
    expect(sectionTitles('doc-carnet')).toContain('Duplicopie');
    expect(sectionTitles('doc-carnet')).not.toContain('Exemplaires');
    const formats = fieldOptions('doc-carnet', 'format');
    expect(formats[0]).toMatch(/A6/);
    expect(fieldOptions('doc-carnet', 'duplicopie')).toContain('Autre nombre personnalisé (>4)');
  });

  it('catalogue — sans reçu ni en-tête', () => {
    const ids = CATALOGUE.map((a) => a.id);
    expect(ids).toContain('doc-carnet');
    expect(ids).toContain('doc-tampon');
    expect(ids).not.toContain('doc-recu');
    expect(ids).not.toContain('doc-entete');
  });

  it('tampon — rond et carré 20/30/50 mm', () => {
    const formats = fieldOptions('doc-tampon', 'format');
    expect(formats).toContain('Rond Ø 20 mm');
    expect(formats).toContain('Carré 30×30 mm');
    expect(formats).toContain('Rond Ø 50 mm');
  });

  it('legacy facturier et reçu redirigent vers carnet', () => {
    expect(resolveAutocopiantCanonicalId('doc-facturier')).toBe('doc-carnet');
    expect(resolveAutocopiantCanonicalId('doc-recu')).toBe('doc-carnet');
    expect(autocopiantLegacyRedirectTarget('doc-recu')).toBe('doc-carnet');
    expect(autocopiantLegacyPrefill('doc-recu')).toEqual({ type: 'Carnet de reçus' });
  });

  it('libellé progression couleurs', () => {
    expect(formatAutocopiantColorProgress([], 2)).toBe('Choisissez 2 couleurs — 0/2 sélectionnée');
    expect(formatAutocopiantColorProgress(['Jaune'], 1)).toBe('Choisissez 1 couleur — 1/1 sélectionnée');
  });
});
