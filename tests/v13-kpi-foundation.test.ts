import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BUSINESS_TIMEZONE,
  resolveBusinessPeriod,
  startOfBusinessDay,
  prismaDateRangeFilter,
  atBusinessHour,
} from '@/lib/kpi/business-clock';
import { kpiFresh, kpiForbidden, kpiNoData, kpiZeroFresh } from '@/lib/kpi/envelope';
import { buildKpiQueryContext } from '@/lib/kpi/context';
import { assertKpiRegistryIntegrity, getKpiDefinition } from '@/lib/kpi/registry';
import { canReadKpi } from '@/lib/kpi/permissions';

describe('V13 BusinessClock', () => {
  it('uses Antananarivo timezone', () => {
    expect(DEFAULT_BUSINESS_TIMEZONE).toBe('Indian/Antananarivo');
  });

  it('month bounds are half-open [from, to)', () => {
    const p = resolveBusinessPeriod({
      preset: 'month',
      now: new Date('2026-08-15T12:00:00.000Z'),
    });
    expect(p.fromIso < p.toIso).toBe(true);
    const filter = prismaDateRangeFilter(p);
    expect(filter.gte).toEqual(p.from);
    expect(filter.lt).toEqual(p.to);
  });

  it('startOfBusinessDay is stable for UTC noon', () => {
    const d = startOfBusinessDay(new Date('2026-08-02T12:00:00.000Z'));
    expect(d.toISOString()).toMatch(/2026-08-0[12]/);
  });

  it('atBusinessHour maps 08:00 Tana to 05:00 UTC', () => {
    const d = atBusinessHour(new Date('2026-08-13T17:30:00+03:00'), 8, 0, 1);
    expect(d.toISOString()).toBe('2026-08-14T05:00:00.000Z');
  });
});

describe('V13 envelope states', () => {
  const base = {
    id: 'COM-003',
    definitionVersion: 1,
    unit: 'COUNT' as const,
    period: { from: 'a', to: 'b', timezone: 'Indian/Antananarivo', label: 't' },
    scope: { tenantId: 'default', siteIds: [], annexIds: [], mode: 'session' },
    freshnessSlaSeconds: 60,
  };

  it('distinguishes zero FRESH from NO_DATA', () => {
    const z = kpiZeroFresh(base);
    expect(z.value).toBe(0);
    expect(z.status).toBe('FRESH');
    const n = kpiNoData(base);
    expect(n.value).toBeNull();
    expect(n.status).toBe('NO_DATA');
  });

  it('FORBIDDEN has no value', () => {
    const f = kpiForbidden(base);
    expect(f.value).toBeNull();
    expect(f.status).toBe('FORBIDDEN');
  });

  it('kpiFresh sets watermark fields', () => {
    const e = kpiFresh({ ...base, value: 3 });
    expect(e.status).toBe('FRESH');
    expect(e.dataAsOf).toBeTruthy();
  });
});

describe('V13 registry & context', () => {
  it('has unique ids and COM-007 + BLOCKED finance', () => {
    expect(assertKpiRegistryIntegrity().ok).toBe(true);
    expect(getKpiDefinition('COM-007')?.status).toBe('ACTIVE');
    expect(getKpiDefinition('DIR-007')?.status).toBe('BLOCKED');
  });

  it('ignores requestedRole spoof', () => {
    const ctx = buildKpiQueryContext({
      userId: 'u1',
      role: 'commercial',
      requestedRole: 'admin',
      permissions: ['devis:read'],
    });
    expect(ctx.role).toBe('commercial');
  });

  it('denies HR kpi without permission', () => {
    const def = getKpiDefinition('RH-002')!;
    const ctx = buildKpiQueryContext({
      userId: 'u1',
      role: 'commercial',
      permissions: ['devis:read'],
    });
    expect(canReadKpi(def, ctx)).toBe(false);
  });
});
