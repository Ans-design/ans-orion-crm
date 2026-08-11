/**
 * Règle globale dimensions ANS Orion :
 * - Grand Format & PVC : saisie et affichage en cm
 * - Calculs surface : conversion interne en m (m²)
 * - Petit format : mm (hors scope de ce module GF)
 */

const STD_FORMATS_CM: Record<string, [number, number]> = {
  A4: [21, 29.7],
  A3: [29.7, 42],
  A2: [42, 59.4],
  A1: [59.4, 84.1],
  A0: [84.1, 118.9],
  A5: [14.8, 21],
  A6: [10.5, 14.8],
  DL: [21, 9.9],
};

function parsePositive(v: unknown): number {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseFormatStringCm(format: string): { longueurCm: number; largeurCm: number } | null {
  const fmtMatch = format.match(/(\d+[,.]?\d*)\s*[×x]\s*(\d+[,.]?\d*)\s*(cm|mm|m)?/i);
  if (fmtMatch) {
    let w = parseFloat(fmtMatch[1].replace(',', '.'));
    let h = parseFloat(fmtMatch[2].replace(',', '.'));
    const unit = (fmtMatch[3] || 'cm').toLowerCase();
    if (unit === 'mm') {
      w /= 10;
      h /= 10;
    } else if (unit === 'm') {
      w *= 100;
      h *= 100;
    }
    if (w > 0 && h > 0) return { longueurCm: w, largeurCm: h };
  }
  const aMatch = format.match(/\b(A[0-6]\+?|DL)\b/i);
  if (aMatch) {
    const std = STD_FORMATS_CM[aMatch[1].toUpperCase()];
    if (std) return { longueurCm: std[0], largeurCm: std[1] };
  }
  return null;
}

/** Dimensions client Grand Format en cm — source unique parsing. */
export function parseGrandFormatDimensionsCm(
  config: Record<string, unknown>,
): { longueurCm: number; largeurCm: number } | null {
  const longueurCm = parsePositive(config.longueur_cm);
  const largeurCm =
    parsePositive(config.largeur_cm) ||
    parsePositive(config.hauteur_cm);

  if (longueurCm > 0 && largeurCm > 0) {
    return { longueurCm, largeurCm };
  }

  const w = parsePositive(config.largeur_cm);
  const h = parsePositive(config.hauteur_cm);
  if (w > 0 && h > 0) {
    return { longueurCm: w, largeurCm: h };
  }

  const lm =
    parsePositive(config.longueur_m)
    || parsePositive(config.largeur_m);
  const hm = parsePositive(config.hauteur_m);
  if (lm > 0 && hm > 0) {
    return {
      longueurCm: Math.round(lm * 100),
      largeurCm: Math.round(hm * 100),
    };
  }

  const fromFormat = parseFormatStringCm(String(config.format ?? ''));
  if (fromFormat) return fromFormat;

  return null;
}

export function cmToM(cm: number): number {
  return cm / 100;
}

export function surfaceM2FromCm(longueurCm: number, largeurCm: number, qty = 1): number {
  return parseFloat(((longueurCm * largeurCm * qty) / 10000).toFixed(4));
}

export function formatCmValue(cm: number): string {
  if (Number.isInteger(cm)) return String(cm);
  return String(Math.round(cm * 10) / 10);
}

/** Affichage récap : `125 × 300 cm` */
export function formatClientDimensionsCm(longueurCm: number, largeurCm: number): string {
  return `${formatCmValue(longueurCm)} × ${formatCmValue(largeurCm)} cm`;
}

/** Affichage laize en cm (ex. `150 cm` ou libellé commercial passé tel quel). */
export function formatLaizeDisplay(laizeCm: number, commercialLabel?: string | null): string {
  if (commercialLabel?.trim()) return commercialLabel;
  return `${formatCmValue(laizeCm)} cm`;
}
