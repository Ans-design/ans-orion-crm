import { describe, expect, it } from 'vitest';
import { isPublicPage } from '@/lib/auth/public-routes';
import {
  canViewPayrollAmounts,
  stripMarginFromReport,
} from '@/lib/auth/margin-access';
import { hasPermission, isDemoBlockedRoute } from '@/lib/auth/permissions';
import { sanitizePricingPayloadForRole } from '@/lib/pricing/sanitize-pricing-payload';

describe('Lot A1 — pages publiques BAT', () => {
  it('ne rend pas /bat public', () => {
    expect(isPublicPage('/bat')).toBe(false);
    expect(isPublicPage('/bat/liste')).toBe(false);
    expect(isPublicPage('/bat/internal')).toBe(false);
  });

  it('autorise uniquement /bat/valider/*', () => {
    expect(isPublicPage('/bat/valider')).toBe(true);
    expect(isPublicPage('/bat/valider/opaque-token')).toBe(true);
    expect(isPublicPage('/login')).toBe(true);
  });
});

describe('Lot A2 — sanitize pricing', () => {
  it('retire marge et coûts pour commercial', () => {
    const payload = {
      prixUnitaire: 1000,
      totalHT: 1000,
      margin: { unitCostEst: 200, marginAmount: 800 },
      formula: 'secret',
      snapshot: { unitCost: 200, priceSource: 'grid', purchasePrice: 150 },
    };
    const out = sanitizePricingPayloadForRole(payload, 'commercial');
    expect(out.margin).toBeUndefined();
    expect(out.formula).toBeUndefined();
    expect(out.prixUnitaire).toBe(1000);
    expect((out.snapshot as Record<string, unknown>).unitCost).toBeUndefined();
    expect((out.snapshot as Record<string, unknown>).purchasePrice).toBeUndefined();
    expect((out.snapshot as Record<string, unknown>).priceSource).toBe('grid');
  });

  it('conserve marge pour admin', () => {
    const payload = { prixUnitaire: 1, margin: { unitCostEst: 1 } };
    expect(sanitizePricingPayloadForRole(payload, 'admin').margin).toEqual({ unitCostEst: 1 });
  });
});

describe('Lot A3/A4 — paie & rapports', () => {
  it('manager n’a pas rh:payroll_read', () => {
    expect(hasPermission('manager', 'rh:payroll_read')).toBe(false);
    expect(canViewPayrollAmounts('manager')).toBe(false);
    expect(canViewPayrollAmounts('admin')).toBe(true);
  });

  it('stripMarginFromReport omet masse salariale hors admin', () => {
    const report = {
      caEncaisse: 10,
      margeEstimee: 5,
      masseSalarialeBrute: 999,
      avancesEnCours: 50,
      avancesCount: 2,
    };
    const commercial = stripMarginFromReport(report, 'commercial');
    expect(commercial).not.toHaveProperty('margeEstimee');
    expect(commercial).not.toHaveProperty('masseSalarialeBrute');
    expect(commercial).not.toHaveProperty('avancesEnCours');
    expect(commercial.caEncaisse).toBe(10);

    const manager = stripMarginFromReport(report, 'manager');
    expect(manager.margeEstimee).toBe(5);
    expect(manager).not.toHaveProperty('masseSalarialeBrute');

    const admin = stripMarginFromReport(report, 'admin');
    expect(admin.masseSalarialeBrute).toBe(999);
  });
});

describe('Lot A5 — permissions fines', () => {
  it('cm:read réservé cm/admin/manager', () => {
    expect(hasPermission('cm', 'cm:read')).toBe(true);
    expect(hasPermission('commercial', 'cm:read')).toBe(false);
    expect(hasPermission('finance', 'finance:read')).toBe(true);
    expect(hasPermission('commercial', 'finance:read')).toBe(false);
  });
});

describe('Lot A6 — démo bloque mutations RH', () => {
  it('bloque POST/PATCH/DELETE /api/rh', () => {
    expect(isDemoBlockedRoute('/api/rh/paie', 'POST', 'demo')).toBe(true);
    expect(isDemoBlockedRoute('/api/rh/employes/x', 'PATCH', 'demo')).toBe(true);
    expect(isDemoBlockedRoute('/api/rh/absences', 'DELETE', 'demo')).toBe(true);
    expect(isDemoBlockedRoute('/api/rh/paie', 'GET', 'demo')).toBe(false);
  });
});
