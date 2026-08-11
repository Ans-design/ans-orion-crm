/**
 * B-08 — messages d’erreur API structurés + unwrap listes devis/fallback.
 * Aucune écriture DB.
 */
import { describe, expect, it } from 'vitest';
import {
  getApiErrorMessage,
  unwrapListItems,
  unwrapPaginated,
} from '@/lib/api-client';

describe('B-08 — getApiErrorMessage', () => {
  it('lit error.message depuis enveloppe { ok:false }', () => {
    expect(
      getApiErrorMessage(
        { ok: false, error: { message: 'Snapshot commande manquant', code: 'SNAPSHOT_MISSING' } },
        'fallback',
      ),
    ).toBe('Snapshot commande manquant');
  });

  it('accepte error string legacy', () => {
    expect(getApiErrorMessage({ error: 'Déjà reçu' }, 'fallback')).toBe('Déjà reçu');
  });

  it('accepte un objet error passé directement', () => {
    expect(getApiErrorMessage({ message: 'Publication refusée', code: 'LOCKED' }, 'fallback')).toBe(
      'Publication refusée',
    );
  });

  it('ne renvoie jamais [object Object]', () => {
    const msg = getApiErrorMessage({ ok: false, error: { message: 'Montant trop élevé' } }, 'Erreur');
    expect(String(msg)).not.toMatch(/\[object Object\]/);
    expect(msg).toBe('Montant trop élevé');
  });
});

describe('B-08 — unwrap listes devis / fallback', () => {
  it('unwrapPaginated lit items paginés', () => {
    const page = unwrapPaginated(
      { items: [{ id: 'd1' }, { id: 'd2' }], total: 2, page: 1, pageSize: 50, totalPages: 1 },
      50,
    );
    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(2);
  });

  it('unwrapListItems lit la clé devis (fallback API)', () => {
    expect(unwrapListItems({ devis: [{ id: 'a' }], total: 0 })).toEqual([{ id: 'a' }]);
  });

  it('objet sans liste → tableau vide (pas de crash .map)', () => {
    expect(unwrapListItems({ ok: true, data: { foo: 1 } })).toEqual([]);
    expect(unwrapPaginated({ statut: 'Brouillon' }, 50).items).toEqual([]);
  });
});
