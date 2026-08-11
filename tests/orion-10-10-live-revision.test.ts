import { describe, expect, it } from 'vitest';
import {
  bumpLiveRevisions,
  getLiveRevision,
  getLiveRevisionsSnapshot,
} from '@/lib/server/live/live-revision-bus';
import { setLiveDomainsOnHeaders } from '@/lib/live/live-response';
import { isUniverseStepComplete } from '@/lib/commande/commande-universe-flow';

describe('live-revision-bus multi-postes', () => {
  it('incrémente et expose max pour domaines', () => {
    const before = getLiveRevision('factures');
    const g = bumpLiveRevisions(['factures', 'paiements']);
    expect(g).toBeGreaterThan(before);
    expect(getLiveRevision('factures')).toBe(g);
    expect(getLiveRevision('paiements')).toBe(g);
    const snap = getLiveRevisionsSnapshot(['factures', 'stock']);
    expect(snap.max).toBeGreaterThanOrEqual(g);
    expect(snap.revisions.factures).toBe(g);
  });

  it('bump via en-tête live API', () => {
    const h = new Headers();
    setLiveDomainsOnHeaders(h, ['commandes', 'caisse']);
    expect(h.get('x-orion-live-domains')).toContain('commandes');
    expect(getLiveRevision('commandes')).toBeGreaterThan(0);
  });
});

describe('univers done honnête (régression)', () => {
  it('finance incomplete si reste > 0', () => {
    expect(
      isUniverseStepComplete('finance', {
        commandeId: 'c1',
        statut: 'Livré',
        reste: 100,
        hasFacture: true,
        hasLivraison: true,
      }),
    ).toBe(false);
  });
});
