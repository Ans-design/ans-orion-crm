import { describe, expect, it } from 'vitest';
import { emptyDashboardStats } from '@/lib/dashboard-fallback';

describe('emptyDashboardStats', () => {
  it('retourne une structure complète avec KPIs à zéro', () => {
    const d = emptyDashboardStats('month');
    expect(d.period).toBe('month');
    expect(d.kpis.caMonth).toBe(0);
    expect(d.alertes).toEqual([]);
    expect(d.recentCmds).toEqual([]);
    expect(d.emptyDatabase).toBe(true);
  });
});
