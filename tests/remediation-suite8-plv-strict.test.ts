import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  PLV_PRINT_RATE_M2_AR,
  getEffectivePlvPrintRateM2Ar,
  getEffectivePlvMaterialRateM2Ar,
  resetPlvRuntimeTariffOverrides,
  setPlvRuntimeTariffOverrides,
} from '@/lib/data/plv-tariffs';
import { computePlvPrice } from '@/lib/pricing/plv-pricing';
import { setPlvDirectSaleRuntimeParams } from '@/lib/pricing/plv-direct-sale-runtime';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('PRX-PLV suite 8 — STRICT sans hardcode', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetPlvRuntimeTariffOverrides();
    setPlvDirectSaleRuntimeParams(null);
  });

  it('en STRICT sans override → print rate 0', () => {
    vi.stubEnv('STRICT_POS_PRICING', 'true');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv('LOCAL_DEV', '');
    expect(getEffectivePlvPrintRateM2Ar()).toBe(0);
    expect(getEffectivePlvMaterialRateM2Ar('PVC rigide')).toBe(0);
    expect(PLV_PRINT_RATE_M2_AR).toBeGreaterThan(0); // archive présente
  });

  it('en STRICT avec override Admin → taux DB', () => {
    vi.stubEnv('STRICT_POS_PRICING', 'true');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv('LOCAL_DEV', '');
    setPlvRuntimeTariffOverrides({ printRateM2Ar: 55_000, materialRateM2Ar: { 'PVC rigide': 40_000 } });
    expect(getEffectivePlvPrintRateM2Ar()).toBe(55_000);
    expect(getEffectivePlvMaterialRateM2Ar('PVC rigide')).toBe(40_000);
  });

  it('computePlvPrice STRICT sans config → sur devis (pas hardcode)', () => {
    vi.stubEnv('STRICT_POS_PRICING', 'true');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv('LOCAL_DEV', '');
    resetPlvRuntimeTariffOverrides();
    const r = computePlvPrice('plv-chevalet', { format: 'A3', matiere: 'Carton ondulé', type: 'Chevalet de table' }, 1);
    expect(r.calculable).toBe(false);
    expect(r.formula).toMatch(/not_configured|incomplete/);
  });

  it('DirectSale flat reste calculable en STRICT (source DB)', () => {
    vi.stubEnv('STRICT_POS_PRICING', 'true');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv('LOCAL_DEV', '');
    setPlvDirectSaleRuntimeParams({
      overrides: [{
        sourceRef: 'AVD008',
        articleId: 'plv-rollup',
        type: 'Roll-up standard',
        format: '80×200 cm',
        unitPrice: 150_000,
      }],
      prixBaseByArticle: { 'plv-rollup': 150_000 },
    });
    const r = computePlvPrice('plv-rollup', { type: 'Roll-up standard', format: '80×200 cm' }, 1);
    expect(r.calculable).toBe(true);
    expect(r.prixUnitaire).toBe(150_000);
    expect(r.formula).toMatch(/directSale/);
  });

  it('APP_ENV=local ignore NODE_ENV=production (fallback archive OK)', () => {
    vi.stubEnv('STRICT_POS_PRICING', '');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_ENV', 'local');
    vi.stubEnv('LOCAL_DEV', 'true');
    resetPlvRuntimeTariffOverrides();
    expect(getEffectivePlvPrintRateM2Ar()).toBe(PLV_PRINT_RATE_M2_AR);
  });
});

describe('Critères 10/10 — checklist', () => {
  it('doc critères présente et honnête', () => {
    const p = join(process.cwd(), 'docs/CRITERIA_10.md');
    expect(existsSync(p)).toBe(true);
    const doc = readFileSync(p, 'utf8');
    expect(doc).toMatch(/pas 10\/10|non atteint|bloquant/i);
    expect(doc).toMatch(/Neon|Postgres/i);
  });
});
