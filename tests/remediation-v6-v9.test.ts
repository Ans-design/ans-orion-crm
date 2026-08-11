import { describe, expect, it } from 'vitest';
import { stripPurchaseOrder, canViewMargin } from '@/lib/auth/margin-access';
import {
  hasPayrollMutationFields,
  stripEmployeePayrollFields,
} from '@/lib/auth/rh-payroll-access';
import { stripMachineNotesForRole } from '@/lib/auth/machine-finance-access';
import { canAccessPage } from '@/lib/page-access';
import { hasPermission } from '@/lib/auth/permissions';
import { sanitizePricingPayloadForRole } from '@/lib/pricing/sanitize-pricing-payload';
import { buildSidebarUniverses } from '@/lib/navigation/build-sidebar-universes';
import { UNIVERSE_MODULE_ORDER } from '@/lib/navigation/sidebar-universes';
import { sumAuthorizedAdminMacroBadges } from '@/lib/administration/admin-macro-modules';
import { serializeMachineNotes } from '@/lib/gpao-meta';

describe('Remédiation V6–V9 — sécurité & navigation', () => {
  it('STK-SEC-01: stripPurchaseOrder retire coûts sans marge', () => {
    const order = {
      id: 'po1',
      numero: 'ACH-1',
      totalHT: 150_000,
      lignes: [{ label: 'Vinyle', qty: 2, unitCost: 50_000, total: 100_000 }],
    };
    const stripped = stripPurchaseOrder(order, 'commercial');
    expect(stripped).not.toHaveProperty('totalHT');
    expect(stripped.lignes?.[0]).not.toHaveProperty('unitCost');
    expect(stripped.lignes?.[0]).not.toHaveProperty('total');
    expect(stripPurchaseOrder(order, 'finance').totalHT).toBe(150_000);
  });

  it('STK-SEC-02: strip coûts finance machines', () => {
    const notes = serializeMachineNotes({
      consumables: [],
      interventions: [{ date: '2026-01-01', type: 'entretien', description: 'x', costMGA: 50_000 }],
      finance: { monthlyCostMGA: 200_000, depreciationMGA: 10_000 },
    });
    const stripped = stripMachineNotesForRole(notes, 'production');
    expect(stripped ?? '').not.toContain('monthlyCostMGA');
    expect(stripMachineNotesForRole(notes, 'finance') ?? '').toContain('monthlyCostMGA');
  });

  it('FIN-MARGIN-01: finance a pos:view_margin', () => {
    expect(hasPermission('finance', 'pos:view_margin')).toBe(true);
    expect(canViewMargin('finance')).toBe(true);
    expect(canViewMargin('commercial')).toBe(false);
  });

  it('FIN-FISCAL-01: finance:write présent pour rôle finance', () => {
    expect(hasPermission('finance', 'finance:write')).toBe(true);
    expect(hasPermission('commercial', 'finance:write')).toBe(false);
  });

  it('RH-P0-01: strip salaires manager sans payroll_read', () => {
    const emp = {
      id: 'e1',
      firstName: 'A',
      lastName: 'B',
      salaireBaseMGA: 900_000,
      primeMGA: 50_000,
      notesFraisMGA: 10_000,
      heuresSup: 4,
    };
    const stripped = stripEmployeePayrollFields(emp, 'manager');
    expect(stripped).not.toHaveProperty('salaireBaseMGA');
    expect(stripped).not.toHaveProperty('primeMGA');
    expect(stripped.firstName).toBe('A');
    expect(stripEmployeePayrollFields(emp, 'admin').salaireBaseMGA).toBe(900_000);
  });

  it('RH-P0-02: détecte champs paie dans mutation', () => {
    expect(hasPayrollMutationFields({ firstName: 'X' })).toBe(false);
    expect(hasPayrollMutationFields({ salaireBaseMGA: 1 })).toBe(true);
  });

  it('RH-P0-03: mon-profil et absences accessibles hors catch-all /rh', () => {
    expect(canAccessPage('production', '/rh/mon-profil')).toBe(true);
    expect(canAccessPage('commercial', '/rh/absences')).toBe(true);
    expect(canAccessPage('production', '/rh/employes')).toBe(false);
  });

  it('PROD/COM/LOG page-access', () => {
    expect(canAccessPage('production', '/production')).toBe(true);
    expect(canAccessPage('cm', '/cm/campagnes')).toBe(true);
    expect(canAccessPage('livraison', '/livraisons')).toBe(true);
  });

  it('POS-03: sanitize price-preview nested result', () => {
    const payload = {
      ok: true,
      articleId: 'a1',
      result: { prix: 10_000, margin: 0.4, unitCost: 2000, snapshot: { unitCost: 2000, prix: 10_000 } },
    };
    const cleaned = sanitizePricingPayloadForRole(payload, 'commercial');
    const result = cleaned.result as Record<string, unknown>;
    expect(result).not.toHaveProperty('margin');
    expect(result).not.toHaveProperty('unitCost');
    expect(result.prix).toBe(10_000);
  });

  it('ME-01: Mon espace prioritaire pour rôles workspace', () => {
    expect(buildSidebarUniverses('production')[0]?.id).toBe('mon_espace');
    expect(buildSidebarUniverses('admin')[0]?.id).not.toBe('mon_espace');
  });

  it('ME-03: ordre mon_espace défini', () => {
    expect(UNIVERSE_MODULE_ORDER.mon_espace?.includes('rh_mon_profil')).toBe(true);
  });

  it('ADM badge parent: prix + anomalies (sans flood unpublished)', () => {
    expect(
      sumAuthorizedAdminMacroBadges({
        unpublished: 247,
        'pricing-missing': 59,
        'anomalies-critical': 70,
      }),
    ).toBe(59 + 70);
  });
});
