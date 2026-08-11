import { describe, expect, it } from 'vitest';
import {
  canViewFinancialKPIs,
  canViewMargin,
  canViewNamedTeamPerformance,
  canViewPayrollAmounts,
  sanitizeCsvCell,
  stripDashboardMarginFields,
  stripMarginFromReport,
  stripNamedTeamPerformance,
  stripOperationsFinancial,
} from '@/lib/auth/margin-access';
import { canAccessPage } from '@/lib/page-access';
import { MODULE_REGISTRY } from '@/lib/modules/module-registry';

describe('Pilotage V5 — permissions helpers', () => {
  it('canViewMargin réservé pos:view_margin', () => {
    expect(canViewMargin('admin')).toBe(true);
    expect(canViewMargin('manager')).toBe(true);
    expect(canViewMargin('production')).toBe(false);
    expect(canViewMargin('designer')).toBe(false);
    expect(canViewMargin('demo')).toBe(false);
  });

  it('canViewFinancialKPIs masque CA atelier', () => {
    expect(canViewFinancialKPIs('admin')).toBe(true);
    expect(canViewFinancialKPIs('finance')).toBe(true);
    expect(canViewFinancialKPIs('production')).toBe(false);
    expect(canViewFinancialKPIs('livraison')).toBe(false);
    expect(canViewFinancialKPIs('designer')).toBe(false);
  });

  it('canViewNamedTeamPerformance exige rh:read', () => {
    expect(canViewNamedTeamPerformance('admin')).toBe(true);
    expect(canViewNamedTeamPerformance('manager')).toBe(true);
    expect(canViewNamedTeamPerformance('production')).toBe(false);
  });

  it('canViewPayrollAmounts = rh:payroll_read', () => {
    expect(canViewPayrollAmounts('admin')).toBe(true);
    expect(canViewPayrollAmounts('manager')).toBe(false);
  });
});

describe('Pilotage V5 — strip payloads', () => {
  it('stripDashboardMarginFields retire marge*', () => {
    const out = stripDashboardMarginFields(
      { kpis: { caMonth: 100, margeGlobale: 12, margeReelle: 5, margeReellePct: 8 } },
      'production',
    );
    expect(out.kpis).toEqual({ caMonth: 100 });
  });

  it('stripOperationsFinancial retire CA', () => {
    const out = stripOperationsFinancial(
      {
        kpis: { cmdUrgentes: 2, caProgressPct: 15 },
        realtime: {
          caMonth: 999,
          caProgressPct: 15,
          commandesEnCours: [{ id: '1', total: 500 }],
        },
      },
      'production',
    );
    expect(out.canViewFinancialKPIs).toBe(false);
    expect(out.kpis?.caProgressPct).toBeUndefined();
    expect(out.realtime?.caMonth).toBeUndefined();
    expect((out.realtime?.commandesEnCours as Array<{ total?: number }>)[0].total).toBeUndefined();
  });

  it('stripMarginFromReport retire paie sans rh:payroll_read', () => {
    const outFinance = stripMarginFromReport(
      {
        caEncaisse: 10,
        masseSalarialeBrute: 1_000_000,
        avancesEnCours: 50_000,
        avancesCount: 2,
        margeEstimee: 40,
      },
      'finance',
    );
    expect(outFinance.caEncaisse).toBe(10);
    expect(outFinance.masseSalarialeBrute).toBeUndefined();
    expect(outFinance.avancesEnCours).toBeUndefined();
    // FIN-MARGIN-01 : finance a pos:view_margin → marge conservée
    expect(outFinance.margeEstimee).toBe(40);

    const outCommercial = stripMarginFromReport(
      { caEncaisse: 10, margeEstimee: 40 },
      'commercial',
    );
    expect(outCommercial.margeEstimee).toBeUndefined();
  });

  it('stripNamedTeamPerformance vide scores nominatifs', () => {
    const out = stripNamedTeamPerformance(
      {
        employees: {
          scores: [{ name: 'Alice', value: 90 }],
          topPerformers: [{ name: 'Alice', value: 90 }],
          byDepartment: [{ name: 'Production', value: 70 }],
          avgScore: 90,
          activeCount: 1,
        },
      },
      'production',
    );
    expect(out.canViewNamedTeamPerformance).toBe(false);
    expect(out.employees?.scores).toEqual([]);
    expect(out.employees?.byDepartment?.[0].name).toBe('Production');
  });

  it('sanitizeCsvCell neutralise formules', () => {
    expect(sanitizeCsvCell('=CMD|A1')).toMatch(/^'/);
    expect(sanitizeCsvCell('+hack')).toMatch(/^'/);
    expect(sanitizeCsvCell('normal')).toBe('normal');
  });
});

describe('Pilotage V5 — page-access & registry', () => {
  it('historique group = rapports_analyse (Pilotage)', () => {
    expect(MODULE_REGISTRY.historique.group).toBe('rapports_analyse');
  });

  it('/dashboard réservé direction/finance', () => {
    expect(canAccessPage('admin', '/dashboard')).toBe(true);
    expect(canAccessPage('production', '/dashboard')).toBe(false);
    expect(canAccessPage('commercial', '/dashboard')).toBe(false);
    expect(canAccessPage('lecture', '/dashboard')).toBe(true);
  });

  it('demo n’a pas /rapports', () => {
    expect(canAccessPage('demo', '/rapports')).toBe(false);
    expect(canAccessPage('demo', '/historique')).toBe(false);
  });

  it('production garde /rapports/performance (scope machines)', () => {
    expect(canAccessPage('production', '/rapports/performance')).toBe(true);
  });
});
