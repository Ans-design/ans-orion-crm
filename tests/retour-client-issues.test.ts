import { describe, expect, it } from 'vitest';
import {
  RETOUR_CLIENT_CATEGORIES,
  buildRetourClientFeedback,
  isRetourClientFeedbackReady,
} from '@/lib/commande/retour-client-issues';

describe('retour-client-issues', () => {
  it('couvre les postes atelier courants', () => {
    const ids = RETOUR_CLIENT_CATEGORIES.map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'impression',
        'calage',
        'faconnage',
        'emballage',
        'graphisme',
        'livraison',
      ]),
    );
  });

  it('exige poste + erreur (ou détail)', () => {
    expect(isRetourClientFeedbackReady({ categoryId: null, issueIds: [] })).toBe(false);
    expect(isRetourClientFeedbackReady({ categoryId: 'impression', issueIds: [] })).toBe(false);
    expect(
      isRetourClientFeedbackReady({ categoryId: 'impression', issueIds: ['couleurs'] }),
    ).toBe(true);
    expect(
      isRetourClientFeedbackReady({
        categoryId: 'autre',
        issueIds: [],
        detail: 'Problème divers',
      }),
    ).toBe(true);
  });

  it('formate le feedback pour le SAV / responsable', () => {
    const text = buildRetourClientFeedback({
      categoryId: 'faconnage',
      issueIds: ['coupe', 'pli'],
      detail: 'Coin bas gauche',
    });
    expect(text).toContain('Poste : Façonnage');
    expect(text).toContain('Erreur(s) :');
    expect(text).toContain('Coupe irrégulière');
    expect(text).toContain('À informer : Atelier façonnage');
    expect(text).toContain('Coin bas gauche');
  });
});
