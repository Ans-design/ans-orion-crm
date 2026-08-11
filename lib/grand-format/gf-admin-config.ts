/**
 * Paramètres Admin Prix — Grand Format & bâche (defaults + runtime SystemConfig).
 */

export type GfPricingSurfaceMode = 'reelle' | 'laize' | 'intelligente';

export const GF_ADMIN_PRICING_CONFIG_KEY = 'gf_admin_pricing_v1';

export type GfAdminPricingConfig = {
  /** Mode surface facturable par défaut pour rouleaux */
  pricingSurfaceMode: GfPricingSurfaceMode;
  /** Seuil arrondi proche laize (cm) */
  laizeMarginCm: number;
  /** Prix unitaire œillet bâche (Ar) */
  eyeletUnitPriceAr: number;
  /** Ourlet — Ar / mètre linéaire */
  ourletPerMlAr: number;
  /** Fourreau — Ar / mètre linéaire */
  fourreauPerMlAr: number;
  /** Renfort — Ar / mètre linéaire */
  renfortPerMlAr: number;
  /** Raccord / soudure — Ar / mètre linéaire */
  raccordPerMlAr: number;
  /** Taux de perte stock (0–1) */
  wasteRate: number;
};

export const DEFAULT_GF_ADMIN_PRICING: GfAdminPricingConfig = {
  /** intelligente = surface facturable avec règle -30 cm ; laize = consommation rouleau brute */
  pricingSurfaceMode: 'intelligente',
  laizeMarginCm: 30,
  eyeletUnitPriceAr: 500,
  ourletPerMlAr: 1_500,
  fourreauPerMlAr: 2_500,
  renfortPerMlAr: 2_000,
  raccordPerMlAr: 3_000,
  wasteRate: 0.08,
};

let runtimePricing: GfAdminPricingConfig | null = null;

export function setGfAdminPricingRuntime(cfg: GfAdminPricingConfig | null): void {
  runtimePricing = cfg ? { ...DEFAULT_GF_ADMIN_PRICING, ...cfg } : null;
}

/** Config effective (Admin runtime ou défauts code). */
export function getGfAdminPricing(): GfAdminPricingConfig {
  return runtimePricing ? { ...runtimePricing } : { ...DEFAULT_GF_ADMIN_PRICING };
}

function num(raw: unknown, fallback: number, min = 0): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min) return fallback;
  return n;
}

export function normalizeGfAdminPricing(raw: unknown): GfAdminPricingConfig {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<GfAdminPricingConfig>;
  const mode = String(o.pricingSurfaceMode ?? DEFAULT_GF_ADMIN_PRICING.pricingSurfaceMode);
  const pricingSurfaceMode: GfPricingSurfaceMode =
    mode === 'reelle' || mode === 'laize' || mode === 'intelligente'
      ? mode
      : DEFAULT_GF_ADMIN_PRICING.pricingSurfaceMode;

  return {
    pricingSurfaceMode,
    laizeMarginCm: num(o.laizeMarginCm, DEFAULT_GF_ADMIN_PRICING.laizeMarginCm),
    eyeletUnitPriceAr: num(o.eyeletUnitPriceAr, DEFAULT_GF_ADMIN_PRICING.eyeletUnitPriceAr),
    ourletPerMlAr: num(o.ourletPerMlAr, DEFAULT_GF_ADMIN_PRICING.ourletPerMlAr),
    fourreauPerMlAr: num(o.fourreauPerMlAr, DEFAULT_GF_ADMIN_PRICING.fourreauPerMlAr),
    renfortPerMlAr: num(o.renfortPerMlAr, DEFAULT_GF_ADMIN_PRICING.renfortPerMlAr),
    raccordPerMlAr: num(o.raccordPerMlAr, DEFAULT_GF_ADMIN_PRICING.raccordPerMlAr),
    wasteRate: Math.min(1, num(o.wasteRate, DEFAULT_GF_ADMIN_PRICING.wasteRate)),
  };
}

/** Surface utilisée pour le prix selon le mode admin. */
export function resolveGfBillableSurfaceM2(params: {
  mode: GfPricingSurfaceMode;
  surfaceReelleM2: number;
  surfaceLaizeM2: number;
  surfaceFactureeM2: number;
}): number {
  switch (params.mode) {
    case 'reelle':
      return params.surfaceReelleM2;
    case 'laize':
      return params.surfaceLaizeM2 > 0 ? params.surfaceLaizeM2 : params.surfaceFactureeM2;
    case 'intelligente':
    default:
      return params.surfaceFactureeM2 > 0 ? params.surfaceFactureeM2 : params.surfaceReelleM2;
  }
}

export function recommendedGfPricingMode(stockKind: 'rouleau' | 'plaque'): GfPricingSurfaceMode {
  return stockKind === 'rouleau' ? 'intelligente' : 'reelle';
}
