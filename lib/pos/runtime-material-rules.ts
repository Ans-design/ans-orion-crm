/** Règles matière POS — surchargeables via Admin → Variables. */

const DEFAULTS = {
  minCarteG: 230,
  minFideliteG: 250,
  maxFlyerG: 300,
};

let overrides: Partial<typeof DEFAULTS> = {};

export function applyMaterialRuleVariables(vars: Record<string, unknown>): void {
  const readNum = (key: string, fallback: number) => {
    const raw = vars[key];
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  overrides = {
    minCarteG: readNum('grammage_min_carte', DEFAULTS.minCarteG),
    minFideliteG: readNum('grammage_min_fidelite', DEFAULTS.minFideliteG),
    maxFlyerG: readNum('grammage_max_flyer', DEFAULTS.maxFlyerG),
  };
}

export function getRuntimeMaterialRules(): typeof DEFAULTS {
  return {
    minCarteG: overrides.minCarteG ?? DEFAULTS.minCarteG,
    minFideliteG: overrides.minFideliteG ?? DEFAULTS.minFideliteG,
    maxFlyerG: overrides.maxFlyerG ?? DEFAULTS.maxFlyerG,
  };
}
