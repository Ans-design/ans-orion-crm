import { describe, expect, it } from 'vitest';
import { countAnomaliesBySeverity } from '@/lib/pricing/pricing-anomalies';
import type { PricingAnomaly } from '@/lib/pricing/pricing-types';

describe('pricing-anomalies', () => {
  it('countAnomaliesBySeverity groups correctly', () => {
    const items: PricingAnomaly[] = [
      { id: '1', severity: 'critical', articleId: 'a', source: 't', message: 'm', recommendedAction: 'r' },
      { id: '2', severity: 'warning', articleId: 'b', source: 't', message: 'm', recommendedAction: 'r' },
      { id: '3', severity: 'warning', articleId: 'c', source: 't', message: 'm', recommendedAction: 'r' },
      { id: '4', severity: 'info', articleId: null, source: 't', message: 'm', recommendedAction: 'r' },
    ];
    expect(countAnomaliesBySeverity(items)).toEqual({ critical: 1, warning: 2, info: 1 });
  });
});

describe('pricing-engine exports', () => {
  it('simulatePrice is computeUnifiedPrice alias', async () => {
    const mod = await import('@/lib/pricing/pricing-engine');
    expect(mod.simulatePrice).toBe(mod.computeUnifiedPrice);
  });
});
