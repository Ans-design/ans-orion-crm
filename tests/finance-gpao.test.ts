import { describe, expect, it } from 'vitest';
import { MODULE_REGISTRY, buildNavForRole } from '@/lib/modules';
import { CHARGE_CATEGORIES, PAYMENT_MODES } from '@/lib/constants/finance-adv';
import { GPAO_16_ETAPES, DOSSIER_STATUTS } from '@/lib/constants/gpao-dossier';
import { ORION_ROADMAP } from '@/lib/modules/roadmap';

describe('Finance avancée module', () => {
  it('registers finance modules', () => {
    expect(MODULE_REGISTRY.finance_charges.href).toBe('/finance/charges');
    expect(MODULE_REGISTRY.finance_couts.status).toBe('active');
    expect(MODULE_REGISTRY.finance_ventes_directes.href).toBe('/finance/ventes-directes');
  });

  it('director nav includes finance avancée', () => {
    const ids = buildNavForRole('admin').flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toContain('finance_charges');
    expect(ids).toContain('finance_couts');
  });

  it('defines finance constants', () => {
    expect(CHARGE_CATEGORIES).toContain('Exploitation');
    expect(PAYMENT_MODES).toContain('Espèces');
  });

  it('roadmap marks step 5 finance as done', () => {
    const step5 = ORION_ROADMAP.find((s) => s.id === 'finance_adv');
    expect(step5?.status).toBe('done');
  });
});

describe('GPAO dossier module', () => {
  it('registers gpao dossiers module', () => {
    expect(MODULE_REGISTRY.gpao_dossiers.href).toBe('/production/dossiers');
    expect(MODULE_REGISTRY.gpao_dossiers.status).toBe('active');
  });

  it('operateur nav includes dossiers GPAO', () => {
    const ids = buildNavForRole('production').flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toContain('gpao_dossiers');
  });

  it('defines 16 GPAO steps', () => {
    expect(GPAO_16_ETAPES).toHaveLength(16);
    expect(GPAO_16_ETAPES[0]).toBe('Commande reçue');
    expect(GPAO_16_ETAPES[15]).toBe('Archivé');
    expect(DOSSIER_STATUTS).toContain('Bloqué');
  });

  it('roadmap marks step 6 gpao as done', () => {
    const step6 = ORION_ROADMAP.find((s) => s.id === 'gpao_enriched');
    expect(step6?.status).toBe('done');
  });
});
