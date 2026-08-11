/**
 * Règle globale dimensions ANS Orion — petit format :
 * - Saisie et affichage en mm
 * - Formats standards (A4, DL…) affichés avec suffixe mm quand dimensions personnalisées
 */

const STD_FORMATS_MM: Record<string, [number, number]> = {
  A4: [210, 297],
  'A4+': [225, 320],
  A3: [297, 420],
  'A3+': [320, 450],
  A2: [420, 594],
  A1: [594, 841],
  A0: [841, 1189],
  A5: [148, 210],
  A6: [105, 148],
  A7: [74, 105],
  A8: [52, 74],
  DL: [99, 210],
  B6: [125, 176],
  B5: [176, 250],
  '85×55': [85, 55],
  '90×50': [90, 50],
};

function parsePositive(v: unknown): number {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseFormatStringMm(format: string): { longueurMm: number; largeurMm: number } | null {
  const fmtMatch = format.match(/(\d+[,.]?\d*)\s*[×x]\s*(\d+[,.]?\d*)\s*(cm|mm|m)?/i);
  if (fmtMatch) {
    let w = parseFloat(fmtMatch[1].replace(',', '.'));
    let h = parseFloat(fmtMatch[2].replace(',', '.'));
    const unit = (fmtMatch[3] || 'mm').toLowerCase();
    if (unit === 'cm') {
      w *= 10;
      h *= 10;
    } else if (unit === 'm') {
      w *= 1000;
      h *= 1000;
    }
    if (w > 0 && h > 0) return { longueurMm: w, largeurMm: h };
  }
  const aMatch = format.match(/\b(A[0-6]\+?|DL)\b/i);
  if (aMatch) {
    const std = STD_FORMATS_MM[aMatch[1].toUpperCase()];
    if (std) return { longueurMm: std[0], largeurMm: std[1] };
  }
  const key = format.replace(/\s/g, '');
  if (STD_FORMATS_MM[key]) {
    const [w, h] = STD_FORMATS_MM[key];
    return { longueurMm: w, largeurMm: h };
  }
  return null;
}

/** Dimensions client petit format en mm. */
export function parsePetitFormatDimensionsMm(
  config: Record<string, unknown>,
): { longueurMm: number; largeurMm: number } | null {
  const longueur =
    parsePositive(config.longueur) ||
    parsePositive(config.longueur_mm) ||
    parsePositive(config.custom_width);
  const largeur =
    parsePositive(config.largeur) ||
    parsePositive(config.largeur_mm) ||
    parsePositive(config.custom_height) ||
    parsePositive(config.hauteur);

  if (longueur > 0 && largeur > 0) {
    return { longueurMm: longueur, largeurMm: largeur };
  }

  const fromFormat = parseFormatStringMm(String(config.format ?? config.dim ?? ''));
  if (fromFormat) return fromFormat;

  return null;
}

export function formatMmValue(mm: number): string {
  if (Number.isInteger(mm)) return String(mm);
  return String(Math.round(mm * 10) / 10);
}

/** Affichage récap : `85 × 55 mm` */
export function formatClientDimensionsMm(longueurMm: number, largeurMm: number): string {
  return `${formatMmValue(longueurMm)} × ${formatMmValue(largeurMm)} mm`;
}

/**
 * Normalise un libellé format petit format / photo → mm uniquement.
 * « 14,5×14,5 cm » → « 145×145 mm » ; ISO inchangé ; séparateur × harmonisé.
 */
export function normalizeDimensionLabel(label: string): string {
  const raw = String(label ?? '').trim();
  if (!raw) return raw;
  if (/personnalis/i.test(raw)) return raw;

  // ISO avec dims (tiret ou espace) : A5 — 148×210 mm | A5 148x210
  const isoWithDims = raw.match(
    /^(A10|A9|A8|A7|A6|A5|A4\+?|A3\+?|A2|A1|A0|DL|B6|B5|SRA3)\s*[—\-–]?\s*(\d+)\s*[x×]\s*(\d+)\s*(mm)?$/i,
  );
  if (isoWithDims) {
    const code = isoWithDims[1]!.toUpperCase().replace('SRA3', 'A3+');
    return `${code} — ${isoWithDims[2]}×${isoWithDims[3]} mm`;
  }

  // Code ISO seul
  if (/^(A10|A9|A8|A7|A6|A5|A4\+?|A3\+?|A2|A1|A0|DL|B6|B5|SRA3)$/i.test(raw)) {
    const code = raw.toUpperCase().replace('SRA3', 'A3+');
    const std = STD_FORMATS_MM[code] ?? (code === 'A3+' ? [320, 450] : code === 'A4+' ? [225, 320] : null);
    if (std) return `${code} — ${std[0]}×${std[1]} mm`;
    return code;
  }

  // Mini — 15×15 cm → 145×145 mm (legacy photo)
  if (/mini\s*[—\-–]?\s*15\s*[x×]\s*15\s*cm/i.test(raw) || /^15\s*[x×]\s*15\s*cm$/i.test(raw)) {
    return '145×145 mm';
  }
  if (/^30\s*[x×]\s*30\s*cm$/i.test(raw)) {
    return '295×295 mm';
  }

  const dim = raw.match(
    /^(?:.*?[—\-–]\s*)?(\d+[,.]?\d*)\s*[x×]\s*(\d+[,.]?\d*)\s*(cm|mm|m)?\s*$/i,
  );
  if (dim) {
    let w = parseFloat(dim[1]!.replace(',', '.'));
    let h = parseFloat(dim[2]!.replace(',', '.'));
    const unit = (dim[3] || '').toLowerCase();
    if (unit === 'cm' || (!unit && w < 80 && h < 80)) {
      // Valeurs < 80 sans unité → cm typiques photo
      if (unit === 'cm' || !unit) {
        w *= 10;
        h *= 10;
      }
    } else if (unit === 'm') {
      w *= 1000;
      h *= 1000;
    }
    // Arrondi mm entiers si proche
    const rw = Math.abs(w - Math.round(w)) < 0.05 ? Math.round(w) : Math.round(w * 10) / 10;
    const rh = Math.abs(h - Math.round(h)) < 0.05 ? Math.round(h) : Math.round(h * 10) / 10;
    return `${formatMmValue(rw)}×${formatMmValue(rh)} mm`;
  }

  // Préfixe ISO + dims cm dans le reste
  const isoPrefix = raw.match(/^(A10|A9|A8|A7|A6|A5|A4\+?|A3\+?|A2|A1|A0|DL|B6|B5)\b/i);
  if (isoPrefix) {
    const rest = raw.slice(isoPrefix[0].length);
    const d = rest.match(/(\d+[,.]?\d*)\s*[x×]\s*(\d+[,.]?\d*)\s*(cm|mm)?/i);
    if (d) {
      let w = parseFloat(d[1]!.replace(',', '.'));
      let h = parseFloat(d[2]!.replace(',', '.'));
      if ((d[3] || '').toLowerCase() === 'cm') {
        w *= 10;
        h *= 10;
      }
      const code = isoPrefix[1]!.toUpperCase();
      return `${code} — ${formatMmValue(w)}×${formatMmValue(h)} mm`;
    }
  }

  return raw.replace(/\s*[x×]\s*/g, '×');
}

/** Indique si l'article relève du petit format (mm). */
export function isPetitFormatArticle(articleId?: string, category?: string): boolean {
  if (!articleId) return false;
  if (articleId.startsWith('gf-') || articleId === 'gf-bache') return false;
  if (category === 'grand_format') return false;
  return true;
}
