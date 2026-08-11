import { describe, expect, it } from 'vitest';
import { extractMaterialNeedFromConfig } from '@/lib/production/material-plan-from-config';
import { canAccessFinanceWritePage, canAccessPage } from '@/lib/page-access';
import { MODULE_REGISTRY } from '@/lib/modules/module-registry';

describe('remédiation reste V6-V9', () => {
  it('PROD-MAT: extrait papier/encre depuis configSnapshot', () => {
    const need = extractMaterialNeedFromConfig(
      { matiere: 'Couché mat', grammage: '150g', impression: 'recto-verso' },
      500,
    );
    expect(need.papier).toContain('Couché mat');
    expect(need.qtePapier).toBe('500');
    expect(need.encre).toBe('recto-verso');
  });

  it('FIN-ACCESS: livraison/lecture bloqués sur factures ; commercial lecture OK', () => {
    expect(canAccessPage('livraison', '/factures')).toBe(false);
    expect(canAccessPage('lecture', '/paiements')).toBe(false);
    expect(canAccessPage('commercial', '/factures')).toBe(true);
    expect(canAccessFinanceWritePage('commercial')).toBe(false);
    expect(canAccessFinanceWritePage('finance')).toBe(true);
    expect(canAccessFinanceWritePage('caisse')).toBe(true);
  });

  it('STK-FEAT: module inventaire pointe vers onglet stock', () => {
    expect(MODULE_REGISTRY.inventaire.href).toBe('/stock?tab=inventaire');
  });

  it('PROD-MAT: label plan matière (pas seulement déchets)', () => {
    expect(MODULE_REGISTRY.plan_matiere.label.toLowerCase()).toContain('matière');
    expect(MODULE_REGISTRY.plan_matiere.href).toBe('/production/dechets');
  });
});
