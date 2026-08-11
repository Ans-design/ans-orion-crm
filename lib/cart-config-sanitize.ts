import {
  isCombinedPaperOption,
  normalizePaperInConfig,
  parseLegacyPaper,
  PAPER_LEGACY_PAIRS,
  resetPaperWeightIfNeeded,
} from '@/lib/data/paper-material';

/** Prépare une config panier/POS pour validation serveur (matière + grammage séparés). */
export function sanitizeCartItemConfig(raw: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const base = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  let { config } = normalizePaperInConfig(base);

  for (const { matiereKey, typeKey, weightKey } of PAPER_LEGACY_PAIRS) {
    const legacy = config[matiereKey];
    if (typeof legacy === 'string' && legacy.trim()) {
      if (isCombinedPaperOption(legacy)) {
        const p = parseLegacyPaper(legacy);
        config[typeKey] = p.paperType;
        if (p.paperWeight) config[weightKey] = p.paperWeight;
      } else if (!config[typeKey]) {
        config[typeKey] = legacy.trim();
      }
      delete config[matiereKey];
    }
  }

  if (typeof config.paper === 'string') {
    if (isCombinedPaperOption(config.paper)) {
      const p = parseLegacyPaper(config.paper);
      config.paperType = p.paperType;
      if (p.paperWeight) config.paperWeight = p.paperWeight;
    }
    delete config.paper;
  }

  if (config.grammage && !config.paperWeight) {
    config.paperWeight = config.grammage;
    delete config.grammage;
  }

  for (const { typeKey } of PAPER_LEGACY_PAIRS) {
    if (config[typeKey]) {
      config = resetPaperWeightIfNeeded(config, typeKey);
    }
  }

  return config;
}

export function isCartBusinessError(message: string): boolean {
  const prefixes = [
    'Configuration refusée',
    'Article «',
    'Grammage ',
    'Impossible de calculer',
    'Configuration papier',
  ];
  return prefixes.some((p) => message.startsWith(p) || message.includes(p));
}
