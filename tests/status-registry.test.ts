import { describe, expect, it } from 'vitest';
import {
  normalizeCommandeStatut,
  isCommandeDone,
  COMMANDE_DONE_DB_STATUTS,
} from '@/lib/data/status-registry';

describe('status-registry', () => {
  it('normalise les statuts legacy commande', () => {
    expect(normalizeCommandeStatut('Livrée')).toBe('Livré');
    expect(normalizeCommandeStatut('Terminée')).toBe('Prête');
    expect(normalizeCommandeStatut('En production')).toBe('En production');
  });

  it('préserve En retard (ne réécrit jamais vers À planifier)', () => {
    expect(normalizeCommandeStatut('En retard')).toBe('En retard');
    expect(normalizeCommandeStatut('En_retard')).toBe('En retard');
    expect(isCommandeDone('En retard')).toBe(false);
  });

  it('détecte commandes terminées (legacy inclus)', () => {
    expect(isCommandeDone('Livré')).toBe(true);
    expect(isCommandeDone('Livrée')).toBe(true);
    expect(isCommandeDone('En production')).toBe(false);
  });

  it('filtre DB inclut legacy', () => {
    expect(COMMANDE_DONE_DB_STATUTS).toContain('Livrée');
    expect(COMMANDE_DONE_DB_STATUTS).toContain('Livré');
  });
});
