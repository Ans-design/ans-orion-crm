/** Libellé format généré depuis les dimensions numériques (sans champ texte). */

const DIM_KEYS = [
  'longueur',
  'largeur',
  'hauteur',
  'profondeur',
  'custom_width',
  'custom_height',
  'custom_gusset',
  'zone_impression_longueur',
  'zone_impression_largeur',
  'diametre_mm',
  'cote',
  'longueur_cm',
  'largeur_cm',
] as const;

function parsePositive(value: unknown): number | null {
  if (value === '' || value === undefined || value === null) return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function fmtMm(values: number[]): string {
  return `${values.map((v) => Math.round(v)).join(' × ')} mm`;
}

function fmtCm(values: number[]): string {
  return `${values.map((v) => Math.round(v * 10) / 10).join(' × ')} cm`;
}

/** True si une option chip correspond à un format / dimension personnalisé. */
export function isCustomFormatChipValue(value: unknown): boolean {
  const v = String(value ?? '').trim().toLowerCase();
  return v.includes('personnalis') || v.includes('sur mesure');
}

/** Construit le libellé affiché (panier, devis, récap) depuis les champs numériques. */
export function buildGeneratedFormatLabel(config: Record<string, unknown>): string | null {
  const legacyL = parsePositive(config.format_largeur);
  const legacyW = parsePositive(config.format_hauteur);

  const l = parsePositive(config.longueur) ?? legacyL;
  const w = parsePositive(config.largeur) ?? legacyW;
  const h = parsePositive(config.hauteur);
  const p = parsePositive(config.profondeur);
  const gusset = parsePositive(config.custom_gusset);
  const cw = parsePositive(config.custom_width);
  const ch = parsePositive(config.custom_height);
  const zoneL = parsePositive(config.zone_impression_longueur);
  const zoneW = parsePositive(config.zone_impression_largeur);
  const diam = parsePositive(config.diametre_mm);
  const cote = parsePositive(config.cote);
  const lCm = parsePositive(config.longueur_cm);
  const wCm = parsePositive(config.largeur_cm);

  if (cw != null && ch != null) {
    const parts = gusset != null ? [cw, ch, gusset] : [cw, ch];
    return fmtMm(parts);
  }

  if (zoneL != null && zoneW != null) return fmtMm([zoneL, zoneW]);

  if (diam != null) {
    const parts = h != null ? [diam, h] : [diam];
    return parts.length === 1 ? `Ø ${Math.round(diam)} mm` : fmtMm(parts);
  }

  if (cote != null) {
    const parts = h != null ? [cote, h] : [cote];
    return parts.length === 1 ? `${Math.round(cote)} mm (côté)` : fmtMm(parts);
  }

  if (lCm != null && wCm != null) return fmtCm([lCm, wCm]);

  if (l != null && w != null) {
    const parts: number[] =
      h != null && p != null ? [l, w, p, h] : h != null ? [l, w, h] : p != null ? [l, w, p] : [l, w];
    return fmtMm(parts);
  }

  if (l != null && h != null && w == null) {
    return fmtMm([l, h]);
  }

  return null;
}

/** Format affiché : preset chip ou libellé généré si personnalisé. */
export function resolveDisplayFormatLabel(
  config: Record<string, unknown>,
  formatFieldKeys: string[] = ['format', 'dimension', 'format_marquage', 'diametre', 'taille'],
): string {
  for (const key of formatFieldKeys) {
    const raw = String(config[key] ?? '').trim();
    if (!raw) continue;
    if (isCustomFormatChipValue(raw)) {
      const generated = buildGeneratedFormatLabel(config);
      return generated ?? 'Format personnalisé';
    }
    return raw;
  }
  const generated = buildGeneratedFormatLabel(config);
  return generated ?? '—';
}

export function configHasNumericDimensions(config: Record<string, unknown>): boolean {
  if (buildGeneratedFormatLabel(config)) return true;
  for (const key of DIM_KEYS) {
    if (parsePositive(config[key]) != null) return true;
  }
  if (parsePositive(config.format_largeur) != null) return true;
  if (parsePositive(config.format_hauteur) != null) return true;
  return false;
}
