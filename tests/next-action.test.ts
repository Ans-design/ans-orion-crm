import { describe, expect, it } from 'vitest';
import { getNextAction, listNextActionsForStatuses } from '@/lib/flow/next-action';
import { resolveCommandeNextAction } from '@/lib/commande/order-next-action';
import { RECOMMENDED_TRANSITIONS } from '@/lib/data/business-workflow';
import {
  buildCommandeUniverseFlowSteps,
  resolveActiveUniverseStepIndex,
} from '@/lib/commande/commande-universe-flow';
import { SIDEBAR_UNIVERSES, COMMANDE_HUB_UNIVERSE_ORDER } from '@/lib/navigation/sidebar-universes';
import { buildSidebarUniverses } from '@/lib/navigation/build-sidebar-universes';

const baseCmd = {
  commandeId: 'cmd-1',
  reste: 0,
  total: 1000,
  hasFacture: false,
  hasLivraison: false,
  hasDossierGpaO: false,
  hasBatPending: false,
  blocagesActifs: 0,
};

describe('next-action flow', () => {
  it('propose création commande pour devis accepté avec deep-link', () => {
    const action = getNextAction({ entity: 'devis', status: 'Accepté', entityId: 'dv-1' });
    expect(action?.id).toBe('devis-to-commande');
    expect(action?.label).toMatch(/commande/i);
    expect(action?.href).toBe('/commandes?fromDevis=dv-1');
  });

  it('deep-link commande Prête → livraisons', () => {
    const action = getNextAction({ entity: 'commande', status: 'Prête', entityId: 'cmd-42' });
    expect(action?.href).toBe('/livraisons?commande=cmd-42');
    expect(action?.module).toBe('logistique');
    expect(action?.id).toBe('cmd-livraison-create');
  });

  it('propose facture quand commande livrée', () => {
    const action = getNextAction({ entity: 'commande', status: 'Livré', entityId: 'cmd-1' });
    expect(action?.id).toBe('cmd-facture-create');
    expect(action?.href).toContain('/factures?commande=cmd-1');
  });

  it('propose contrôle qualité pour production En finition', () => {
    const action = getNextAction({ entity: 'production', status: 'En finition', entityId: 'cmd-9' });
    expect(action?.id).toBe('prod-cq');
    expect(action?.href).toContain('/production/qualite');
    expect(action?.href).toContain('commande=cmd-9');
  });

  it('propose action livraison pour statut Préparation', () => {
    const action = getNextAction({ entity: 'livraison', status: 'Préparation' });
    expect(action?.id).toBe('liv-prep');
    expect(action?.href).toBe('/livraisons');
  });

  it('client Inactif deep-link vers fiche client', () => {
    const action = getNextAction({ entity: 'client', status: 'Inactif', entityId: 'cli-42' });
    expect(action?.id).toBe('client-reactiver');
    expect(action?.href).toBe('/clients/cli-42');
  });

  it('client Actif / CRM → catalogue vente (pas devis direct)', () => {
    const actif = getNextAction({ entity: 'client', status: 'Actif', entityId: 'cli-1' });
    expect(actif?.href).toBe('/pos');
    const crm = getNextAction({ entity: 'client', status: 'CRM', entityId: 'cli-1' });
    expect(crm?.href).toBe('/pos');
  });

  it('devis brouillon reste en proforma (Devis)', () => {
    const action = getNextAction({ entity: 'devis', status: 'Brouillon', entityId: 'dv-1' });
    expect(action?.id).toBe('devis-send');
    expect(action?.href).toContain('/devis');
  });

  it('hub commande En finition → CQ', () => {
    const action = resolveCommandeNextAction({
      ...baseCmd,
      commandeId: 'cmd-cq',
      statut: 'En finition',
      hasDossierGpaO: true,
    });
    expect(action?.id).toBe('cmd-cq');
    expect(action?.href).toBe('/production/qualite?commande=cmd-cq');
  });

  it('hub accepte clés Prisma Livre / Prete', () => {
    expect(
      resolveCommandeNextAction({
        ...baseCmd,
        statut: 'Livre',
        hasFacture: false,
      })?.id,
    ).toBe('cmd-facture-create');
    expect(
      resolveCommandeNextAction({
        ...baseCmd,
        statut: 'Prete',
        hasLivraison: false,
      })?.id,
    ).toBe('cmd-livraison-create');
  });

  it('hub BAT pending → Studio', () => {
    const action = resolveCommandeNextAction({
      ...baseCmd,
      statut: 'À planifier',
      hasBatPending: true,
    });
    expect(action?.id).toBe('cmd-bat');
    expect(action?.module).toBe('bat');
  });

  it('hub stock → Stock & Achats', () => {
    const action = resolveCommandeNextAction({
      ...baseCmd,
      statut: 'En attente stock',
    });
    expect(action?.id).toBe('cmd-stock');
    expect(action?.href).toContain('/stock?commande=');
  });

  it('hub En production sans Talk → Communication', () => {
    const action = resolveCommandeNextAction({
      ...baseCmd,
      statut: 'En production',
      hasDossierGpaO: true,
      hasTalk: false,
    });
    expect(action?.id).toBe('cmd-talk');
    expect(action?.module).toBe('communication');
  });

  it('hub Livré payé → Pilotage / historique', () => {
    const action = resolveCommandeNextAction({
      ...baseCmd,
      statut: 'Livré',
      hasFacture: true,
      reste: 0,
    });
    expect(action?.id).toBe('cmd-close');
    expect(action?.href).toContain('/historique?commande=');
    expect(action?.module).toBe('pilotage');
  });

  it('transitions recommandées incluent le contrôle qualité', () => {
    expect(RECOMMENDED_TRANSITIONS.some((t) => t.to === 'En contrôle qualité')).toBe(true);
    expect(RECOMMENDED_TRANSITIONS.some((t) => t.from === 'En contrôle qualité')).toBe(true);
  });

  it('déduplique les actions cockpit', () => {
    const actions = listNextActionsForStatuses([
      { entity: 'commande', status: 'Prête', entityId: 'a' },
      { entity: 'commande', status: 'Prête', entityId: 'b' },
      { entity: 'devis', status: 'Accepté', entityId: 'd1' },
    ]);
    expect(actions.some((a) => a.id === 'cmd-livraison-create')).toBe(true);
    expect(actions.some((a) => a.id === 'devis-to-commande')).toBe(true);
    expect(actions.filter((a) => a.id === 'cmd-livraison-create')).toHaveLength(1);
  });
});

describe('sidebar universes — ordre métier', () => {
  it('ordonne Stock avant Studio et Production ; Communication avant Logistique', () => {
    const ids = SIDEBAR_UNIVERSES.map((u) => u.id);
    expect(ids.indexOf('stock')).toBeLessThan(ids.indexOf('studio'));
    expect(ids.indexOf('studio')).toBeLessThan(ids.indexOf('production'));
    expect(ids.indexOf('production')).toBeLessThan(ids.indexOf('communication'));
    expect(ids.indexOf('communication')).toBeLessThan(ids.indexOf('logistique'));
    expect(ids.indexOf('logistique')).toBeLessThan(ids.indexOf('finance'));
    expect(ids.indexOf('administration')).toBeLessThan(ids.indexOf('mon_espace'));
  });

  it('admin voit les univers dans l’ordre chronologique opérationnel', () => {
    const universes = buildSidebarUniverses('admin');
    const ids = universes.map((u) => u.id);
    expect(ids.indexOf('commercial')).toBeLessThan(ids.indexOf('stock'));
    expect(ids.indexOf('stock')).toBeLessThan(ids.indexOf('studio'));
    expect(ids.indexOf('studio')).toBeLessThan(ids.indexOf('production'));
    expect(ids.indexOf('communication')).toBeLessThan(ids.indexOf('logistique'));
    expect(ids[ids.length - 2]).toBe('administration');
    expect(ids[ids.length - 1]).toBe('mon_espace');
  });

  it('chaque univers a un flowLabel', () => {
    for (const u of SIDEBAR_UNIVERSES) {
      expect(u.flowLabel, u.id).toBeTruthy();
    }
  });
});

describe('commande universe flow strip', () => {
  it('expose 7 étapes hub', () => {
    expect([...COMMANDE_HUB_UNIVERSE_ORDER]).toEqual([
      'commercial',
      'stock',
      'studio',
      'production',
      'communication',
      'logistique',
      'finance',
    ]);
  });

  it('active Studio si BAT pending', () => {
    const idx = resolveActiveUniverseStepIndex({
      commandeId: 'c1',
      statut: 'À planifier',
      reste: 0,
      hasBatPending: true,
    });
    expect(COMMANDE_HUB_UNIVERSE_ORDER[idx]).toBe('studio');
  });

  it('active Production en production (pas « fait » tant que non Prête)', () => {
    const steps = buildCommandeUniverseFlowSteps({
      commandeId: 'c1',
      statut: 'En production',
      reste: 0,
      hasDossierGpaO: true,
    });
    const active = steps.find((s) => s.state === 'active');
    expect(active?.id).toBe('production');
    expect(steps.find((s) => s.id === 'production')?.state).not.toBe('done');
    expect(active?.href).toContain('commande=c1');
  });

  it('ne marque pas Stock/Studio/Finance faits sans critères', () => {
    const steps = buildCommandeUniverseFlowSteps({
      commandeId: 'c1',
      statut: 'Prête',
      reste: 5000,
      hasBatPending: true,
      hasLivraison: false,
      hasFacture: false,
    });
    expect(steps.find((s) => s.id === 'studio')?.state).not.toBe('done');
    expect(steps.find((s) => s.id === 'logistique')?.state).not.toBe('done');
    expect(steps.find((s) => s.id === 'finance')?.state).not.toBe('done');
    expect(steps.find((s) => s.state === 'active')?.id).toBe('studio');
  });

  it('Finance faite seulement si reste soldé + facture', () => {
    const steps = buildCommandeUniverseFlowSteps({
      commandeId: 'c1',
      statut: 'Livré',
      reste: 0,
      hasLivraison: true,
      hasFacture: true,
      hasBatPending: false,
      avancement: 100,
    });
    expect(steps.find((s) => s.id === 'logistique')?.state).toBe('done');
    expect(steps.find((s) => s.id === 'finance')?.state).toBe('done');
  });

  it('active Logistique quand Prête', () => {
    const idx = resolveActiveUniverseStepIndex({
      commandeId: 'c1',
      statut: 'Prête',
      reste: 0,
    });
    expect(COMMANDE_HUB_UNIVERSE_ORDER[idx]).toBe('logistique');
  });
});
