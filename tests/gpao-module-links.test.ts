import { describe, expect, it } from 'vitest';
import { GPAO_16_ETAPES } from '@/lib/constants/gpao-dossier';
import {
  resolveGpaoEtapeModuleLink,
  resolveSidebarModuleHrefForCommande,
} from '@/lib/gpao/gpao-module-links';

describe('gpao-module-links', () => {
  it('chaque étape GPAO pointe vers un module réel', () => {
    for (const nom of GPAO_16_ETAPES) {
      const link = resolveGpaoEtapeModuleLink(nom, { commandeId: 'cmd-1' });
      expect(link.href.length).toBeGreaterThan(1);
      expect(link.moduleId.length).toBeGreaterThan(0);
      expect(link.href).not.toBe('#');
    }
  });

  it('BAT / Impression / Qualité / Livraison ciblent les bons modules', () => {
    expect(resolveGpaoEtapeModuleLink('BAT validé', { commandeId: 'c1' }).href).toContain('/commandes/c1');
    expect(resolveGpaoEtapeModuleLink('Impression', { commandeId: 'c1' }).href).toContain('/equipe/taches');
    expect(resolveGpaoEtapeModuleLink('Contrôle qualité', { commandeId: 'c1' }).href).toContain('/production/qualite');
    expect(resolveGpaoEtapeModuleLink('Livré', { commandeId: 'c1' }).href).toContain('/livraisons');
    expect(resolveGpaoEtapeModuleLink('Facturé / payé', { commandeId: 'c1' }).href).toContain('/factures');
  });

  it('sidebar Production deep-linke la commande active', () => {
    expect(resolveSidebarModuleHrefForCommande('gpao_dossiers', '/production/dossiers', 'c1')).toBe(
      '/production/dossiers?commande=c1',
    );
    expect(resolveSidebarModuleHrefForCommande('planning', '/planning', 'c1')).toBe(
      '/planning?commande=c1',
    );
    expect(resolveSidebarModuleHrefForCommande('equipe_taches', '/equipe/taches', 'c1')).toBe(
      '/equipe/taches?commandeId=c1',
    );
  });
});
