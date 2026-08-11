import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GF_CUTTING_MARGINS,
  applyGfCuttingMarginToA0Price,
  getGfCuttingMargins,
  setGfCuttingMarginsRuntime,
} from '@/lib/grand-format/cutting-margins';

describe('gf cutting margins admin runtime', () => {
  it('defaults A0=0% … A5=25%', () => {
    const byCode = Object.fromEntries(DEFAULT_GF_CUTTING_MARGINS.map((r) => [r.formatCode, r]));
    expect(byCode.A0?.marginPercent).toBe(0);
    expect(byCode.A1?.marginPercent).toBe(5);
    expect(byCode.A5?.marginPercent).toBe(25);
  });

  it('runtime override impacte A2', () => {
    setGfCuttingMarginsRuntime(
      DEFAULT_GF_CUTTING_MARGINS.map((r) =>
        r.formatCode === 'A2' ? { ...r, marginPercent: 12 } : r,
      ),
    );
    expect(getGfCuttingMargins().find((r) => r.formatCode === 'A2')?.marginPercent).toBe(12);
    const app = applyGfCuttingMarginToA0Price(40_000, 'A2');
    // base 10000 + 12% = 11200
    expect(app?.finalPrice).toBe(11_200);
    setGfCuttingMarginsRuntime(null);
  });
});
