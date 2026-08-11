/**
 * Présentoirs magasin — dimensions standards PLV.
 *
 * Sources croisées (imprimerie / PLV professionnel) :
 * - CJS PLV — palettes 600×400, 800×600, 1200×800 mm ; réduction emballage −15 mm
 * - Kontfeel — box demi-palette 60×80 cm, colonne 40×40×170 cm
 * - Europlv — box palette ¼ / ½ / palette Europe
 * - Séquoia Factory — colonne 600×400×1800 mm (1/4 palette)
 */

export type PresentoirFormatSpec = {
  label: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  /** Surface développée estimée (faces visibles + plateaux) — m² */
  developpeM2: number;
  source: string;
};

/** Dimensions par défaut — modifiables admin via champs largeur_mm / hauteur_mm / profondeur_mm. */
export const PRESENTOIR_FORMAT_SPECS: Record<string, PresentoirFormatSpec> = {
  Standard: {
    label: 'Standard',
    widthMm: 400,
    heightMm: 1200,
    depthMm: 400,
    developpeM2: 2.4,
    source: 'PLV sol générique — CJS PLV',
  },
  'Présentoir comptoir': {
    label: 'Présentoir comptoir',
    widthMm: 400,
    heightMm: 450,
    depthMm: 300,
    developpeM2: 0.65,
    source: 'Comptoir magasin — Kontfeel / CJS PLV',
  },
  'Comptoir / Escalier': {
    label: 'Comptoir / Escalier',
    widthMm: 450,
    heightMm: 500,
    depthMm: 350,
    developpeM2: 0.78,
    source: 'Escalier comptoir PLV',
  },
  'Quart de palette (60×40 cm)': {
    label: 'Quart de palette (60×40 cm)',
    widthMm: 600,
    heightMm: 1500,
    depthMm: 400,
    developpeM2: 3.2,
    source: 'CJS PLV 600×400 — hors tout emballage',
  },
  'Demi-palette (80×60 cm)': {
    label: 'Demi-palette (80×60 cm)',
    widthMm: 800,
    heightMm: 1400,
    depthMm: 600,
    developpeM2: 4.8,
    source: 'Kontfeel box demi-palette 60×80 cm',
  },
  'Demi-palette': {
    label: 'Demi-palette',
    widthMm: 800,
    heightMm: 1400,
    depthMm: 600,
    developpeM2: 4.8,
    source: 'Kontfeel / Europlv demi-palette',
  },
  'Palette complète (120×80 cm)': {
    label: 'Palette complète (120×80 cm)',
    widthMm: 1200,
    heightMm: 1600,
    depthMm: 800,
    developpeM2: 7.2,
    source: 'Europlv palette Europe 120×80 cm',
  },
  'Palette complète': {
    label: 'Palette complète',
    widthMm: 1200,
    heightMm: 1600,
    depthMm: 800,
    developpeM2: 7.2,
    source: 'Europlv palette Europe',
  },
  'Présentoir 4 faces': {
    label: 'Présentoir 4 faces',
    widthMm: 400,
    heightMm: 1700,
    depthMm: 400,
    developpeM2: 3.6,
    source: 'Kontfeel colonne 4 faces 40×40×170 cm',
  },
  '4 faces': {
    label: '4 faces',
    widthMm: 400,
    heightMm: 1700,
    depthMm: 400,
    developpeM2: 3.6,
    source: 'Kontfeel colonne 4 faces',
  },
  'Présentoir 6 faces': {
    label: 'Présentoir 6 faces',
    widthMm: 520,
    heightMm: 1750,
    depthMm: 450,
    developpeM2: 4.5,
    source: 'Colonne hexagonale PLV — CJS PLV',
  },
  '6 faces': {
    label: '6 faces',
    widthMm: 520,
    heightMm: 1750,
    depthMm: 450,
    developpeM2: 4.5,
    source: 'Colonne 6 faces',
  },
  'Présentoir 8 faces': {
    label: 'Présentoir 8 faces',
    widthMm: 600,
    heightMm: 1800,
    depthMm: 600,
    developpeM2: 5.8,
    source: 'Colonne octogonale PLV',
  },
  '8 faces': {
    label: '8 faces',
    widthMm: 600,
    heightMm: 1800,
    depthMm: 600,
    developpeM2: 5.8,
    source: 'Colonne 8 faces',
  },
  'Colonne tournante': {
    label: 'Colonne tournante',
    widthMm: 400,
    heightMm: 1800,
    depthMm: 400,
    developpeM2: 3.8,
    source: 'Séquoia Factory 600×400×1800 mm',
  },
  'Présentoir sol': {
    label: 'Présentoir sol',
    widthMm: 600,
    heightMm: 1500,
    depthMm: 400,
    developpeM2: 3.4,
    source: 'Présentoir sol carton — CJS PLV',
  },
  'Présentoir carton': {
    label: 'Présentoir carton',
    widthMm: 600,
    heightMm: 1200,
    depthMm: 400,
    developpeM2: 2.9,
    source: 'Quart palette carton Kontfeel',
  },
  'Présentoir PVC': {
    label: 'Présentoir PVC',
    widthMm: 500,
    heightMm: 1600,
    depthMm: 400,
    developpeM2: 3.2,
    source: 'Structure PVC rigide PLV',
  },
  'Présentoir métallique': {
    label: 'Présentoir métallique',
    widthMm: 450,
    heightMm: 1750,
    depthMm: 450,
    developpeM2: 3.5,
    source: 'Structure métal PLV magasin',
  },
  'Box palette / Bac de sol': {
    label: 'Box palette / Bac de sol',
    widthMm: 800,
    heightMm: 1400,
    depthMm: 600,
    developpeM2: 4.8,
    source: 'Demi-palette Kontfeel',
  },
};

export const PRESENTOIR_MAGASIN_FORMAT_OPTIONS = [
  'Présentoir comptoir',
  'Comptoir / Escalier',
  'Quart de palette (60×40 cm)',
  'Demi-palette (80×60 cm)',
  'Palette complète (120×80 cm)',
  'Présentoir 4 faces',
  'Présentoir 6 faces',
  'Présentoir 8 faces',
  'Colonne tournante',
  'Présentoir sol',
  'Présentoir carton',
  'Présentoir PVC',
  'Présentoir métallique',
  'Format personnalisé',
] as const;

export function getPresentoirFormatSpec(formatLabel: string): PresentoirFormatSpec | null {
  const key = String(formatLabel ?? '').trim();
  if (!key || /personnalis/i.test(key)) return null;
  return PRESENTOIR_FORMAT_SPECS[key] ?? null;
}

/** Sous-titre chip format — L × H × P. */
export function getPresentoirFormatChipSubtitle(formatLabel: string): string | null {
  const spec = getPresentoirFormatSpec(formatLabel);
  if (!spec) return null;
  return `L×H×P : ${spec.widthMm}×${spec.heightMm}×${spec.depthMm} mm · ~${spec.developpeM2} m²`;
}

/** Détail complet sous chip sélectionnée. */
export function getPresentoirFormatDetail(formatLabel: string): string | null {
  const spec = getPresentoirFormatSpec(formatLabel);
  if (!spec) return null;
  return `Dimensions : ${spec.widthMm}×${spec.heightMm}×${spec.depthMm} mm — développé ~${spec.developpeM2} m² — ${spec.source}`;
}

export function resolvePresentoirDimensionsMm(config: Record<string, unknown>): {
  widthMm: number;
  heightMm: number;
  depthMm: number;
  developpeM2: number;
  formatLabel: string;
} | null {
  const format = String(config.format ?? '').trim();
  const customW = Number(config.largeur_mm ?? config.largeur);
  const customH = Number(config.hauteur_mm ?? config.hauteur);
  const customD = Number(config.profondeur_mm ?? config.profondeur);

  if (/personnalis/i.test(format)) {
    if (!Number.isFinite(customW) || !Number.isFinite(customH) || customW <= 0 || customH <= 0) {
      return null;
    }
    const depthMm = Number.isFinite(customD) && customD > 0 ? customD : 400;
    const developpeM2 = parseFloat(
      ((customW * customH * 2 + customW * depthMm * 2 + customH * depthMm) / 1_000_000).toFixed(3),
    );
    return {
      widthMm: Math.round(customW),
      heightMm: Math.round(customH),
      depthMm: Math.round(depthMm),
      developpeM2: Math.max(developpeM2, 0.1),
      formatLabel: 'Format personnalisé',
    };
  }

  const spec = getPresentoirFormatSpec(format);
  if (!spec) return null;

  const w = Number(config.largeur_mm) > 0 ? Number(config.largeur_mm) : spec.widthMm;
  const h = Number(config.hauteur_mm) > 0 ? Number(config.hauteur_mm) : spec.heightMm;
  const d = Number(config.profondeur_mm) > 0 ? Number(config.profondeur_mm) : spec.depthMm;

  return {
    widthMm: Math.round(w),
    heightMm: Math.round(h),
    depthMm: Math.round(d),
    developpeM2: spec.developpeM2,
    formatLabel: spec.label,
  };
}
