import { describe, expect, it, vi, afterEach } from 'vitest';
import { readMga, commandeMoneyFields, paiementMontantMga } from '@/lib/money/amounts';
import { tryComputePrix2026GridPrice } from '@/lib/pricing/prix-2026-grid-price';
import { getEffectiveFinitionBasePrices, FINITION_BASE_PRICES } from '@/lib/finition/finition-price-catalog';
import { isPrix2026LegacyEnabled } from '@/lib/pricing/prix-2026-legacy';

describe('FIN-01 readMga', () => {
  it('arrondit en ariary entier', () => {
    expect(readMga(100.7)).toBe(101);
    expect(paiementMontantMga({ montant: 50.4 })).toBe(50);
  });

  it('commandeMoneyFields calcule reste', () => {
    const m = commandeMoneyFields({
      total: 1000,
      acompte: 400,
    });
    expect(m).toEqual({ total: 1000, acompte: 400, reste: 600 });
  });
});

describe('PRX-01 Excel grille gated', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('legacy désactivé par défaut', () => {
    expect(isPrix2026LegacyEnabled()).toBe(false);
  });

  it('tryComputePrix2026GridPrice retourne null sans legacy', async () => {
    vi.stubEnv('USE_PRIX_2026_LEGACY', '');
    vi.stubEnv('STRICT_POS_PRICING', 'true');
    const r = await tryComputePrix2026GridPrice('goo-mug', { qty: 50 });
    expect(r).toBeNull();
  });
});

describe('PRX-03 FINITION strict', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('en strict sans overrides → zéros (pas de hardcode Excel)', () => {
    vi.stubEnv('STRICT_POS_PRICING', 'true');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_ENV', '');
    const P = getEffectiveFinitionBasePrices();
    expect(P.rainagePerPliA4).toBe(0);
    expect(P.pelliculageA4Recto).toBe(0);
    // Constantes archive toujours présentes hors chemin runtime
    expect(FINITION_BASE_PRICES.rainagePerPliA4).toBeGreaterThan(0);
  });
});
