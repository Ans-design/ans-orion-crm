/**
 * Alias commerciaux arrondis ↔ formats ISO standards.
 * Ex. 20×30 cm ≈ A4 — même tarif, pas de chip séparé.
 */

/** Libellés canoniques ISO (petits formats = mm). */
export const CANONICAL_ISO_FORMAT_LABELS: Record<string, string> = {
  A6: 'A6 — 105×148 mm',
  A5: 'A5 — 148×210 mm',
  A4: 'A4 — 210×297 mm',
  'A4+': 'A4+ — 225×320 mm',
  A3: 'A3 — 297×420 mm',
  'A3+': 'A3+ — 320×450 mm',
  A2: 'A2 — 420×594 mm',
  A1: 'A1 — 594×841 mm',
  A0: 'A0 — 841×1189 mm',
  DL: 'DL — 99×210 mm',
  B6: 'B6 — 125×176 mm',
  B5: 'B5 — 176×250 mm',
  A7: 'A7 — 74×105 mm',
  A8: 'A8 — 52×74 mm',
};

export type FormatCommercialAlias = {
  exact: string;
  commercial: string;
  /** Dimensions commerciales arrondies en mm (orientation libre). */
  commercialMm: [number, number];
  priceEquivalent: string;
};

/**
 * Table centrale — A5→A0.
 * commercialMm = dimensions arrondies utilisées par les opérateurs.
 */
export const FORMAT_COMMERCIAL_ALIASES: Record<string, FormatCommercialAlias> = {
  A5: {
    exact: '148×210 mm',
    commercial: '≈ 15×20 cm',
    commercialMm: [150, 200],
    priceEquivalent: 'A5',
  },
  A4: {
    exact: '210×297 mm',
    commercial: '≈ 20×30 cm',
    commercialMm: [200, 300],
    priceEquivalent: 'A4',
  },
  A3: {
    exact: '297×420 mm',
    commercial: '≈ 30×40 cm',
    commercialMm: [300, 400],
    priceEquivalent: 'A3',
  },
  A2: {
    exact: '420×594 mm',
    commercial: '≈ 40×60 cm',
    commercialMm: [400, 600],
    priceEquivalent: 'A2',
  },
  A1: {
    exact: '594×841 mm',
    commercial: '≈ 60×80 cm',
    commercialMm: [600, 800],
    priceEquivalent: 'A1',
  },
  A0: {
    exact: '841×1189 mm',
    commercial: '≈ 80×120 cm',
    commercialMm: [800, 1200],
    priceEquivalent: 'A0',
  },
};

export type ResolvedFormatAlias = {
  canonicalFormat: string;
  exactDimensions: string;
  commercialAlias: string;
  priceEquivalent: string;
  /** Libellé POS complet avec parenthèses. */
  displayLabel: string;
  /** Libellé court sans parenthèses. */
  shortLabel: string;
  matchedVia: 'iso' | 'exact-mm' | 'commercial-cm' | 'commercial-mm';
};

const COMMERCIAL_PAREN_RE = /\s*\(≈[^)]*\)\s*$/;

/** Retire le suffixe commercial pour comparer / stocker la clé courte. */
export function stripCommercialAliasSuffix(label: string): string {
  return String(label ?? '')
    .replace(COMMERCIAL_PAREN_RE, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sortPair(a: number, b: number): [number, number] {
  return a <= b ? [a, b] : [b, a];
}

function dimsClose(
  w: number,
  h: number,
  tw: number,
  th: number,
  tolMm: number,
): boolean {
  const [a, b] = sortPair(w, h);
  const [c, d] = sortPair(tw, th);
  return Math.abs(a - c) <= tolMm && Math.abs(b - d) <= tolMm;
}

/** Parse L×H (+ unité) → mm triés, ou null. */
export function parseDimsToSortedMm(input: string): [number, number] | null {
  const s = String(input ?? '').trim();
  if (!s) return null;
  const dim = s.match(/(\d+[,.]?\d*)\s*[×x]\s*(\d+[,.]?\d*)\s*(cm|mm|m)?/i);
  if (!dim) return null;
  let w = parseFloat(dim[1]!.replace(',', '.'));
  let h = parseFloat(dim[2]!.replace(',', '.'));
  const unit = (dim[3] || '').toLowerCase();
  if (unit === 'cm' || (!unit && w < 80 && h < 80)) {
    w *= 10;
    h *= 10;
  } else if (unit === 'm') {
    w *= 1000;
    h *= 1000;
  }
  if (!(w > 0 && h > 0)) return null;
  return sortPair(Math.round(w), Math.round(h));
}

/**
 * Tolérance : dims commerciales arrondies (±10 mm).
 * Ex. 200×300, 20×30 cm, 30×20 cm → A4.
 */
export function matchCommercialAliasByDims(
  widthMm: number,
  heightMm: number,
  tolMm = 10,
): string | null {
  if (!(widthMm > 0) || !(heightMm > 0)) return null;
  for (const [code, alias] of Object.entries(FORMAT_COMMERCIAL_ALIASES)) {
    const [cw, ch] = alias.commercialMm;
    if (dimsClose(widthMm, heightMm, cw, ch, tolMm)) return code;
  }
  return null;
}

/** Match dims exactes ISO (±2 mm). */
export function matchExactIsoByDims(
  widthMm: number,
  heightMm: number,
  tolMm = 2,
): string | null {
  for (const [code, label] of Object.entries(CANONICAL_ISO_FORMAT_LABELS)) {
    const m = label.match(/(\d+)\s*[×x]\s*(\d+)/);
    if (!m) continue;
    if (dimsClose(widthMm, heightMm, Number(m[1]), Number(m[2]), tolMm)) return code;
  }
  return null;
}

export function getCommercialAliasEntry(code: string): FormatCommercialAlias | null {
  const key = String(code ?? '').toUpperCase().replace('SRA3', 'A3+');
  return FORMAT_COMMERCIAL_ALIASES[key] ?? null;
}

/**
 * Libellé POS recommandé :
 * A4 — 210×297 mm (≈ 20×30 cm — tarif A4)
 */
export function getCommercialFormatLabel(formatOrCode: string): string {
  const resolved = normalizeFormatAlias(formatOrCode);
  if (!resolved) {
    const short = stripCommercialAliasSuffix(formatOrCode);
    return CANONICAL_ISO_FORMAT_LABELS[short.toUpperCase()] ?? short;
  }
  return resolved.displayLabel;
}

/** Sous-texte compact si l’UI manque de place. */
export function getCommercialFormatSubtitle(formatOrCode: string): string | null {
  const resolved = normalizeFormatAlias(formatOrCode);
  if (!resolved?.commercialAlias) return null;
  return `équiv. commercial ${resolved.commercialAlias}`;
}

export function getCanonicalFormat(input: string): string | null {
  return normalizeFormatAlias(input)?.canonicalFormat ?? null;
}

export function getPriceEquivalentFormat(input: string): string | null {
  return normalizeFormatAlias(input)?.priceEquivalent ?? null;
}

/**
 * Reconnaît A4 / 210×297 mm / 20×30 cm / 30×20 cm / A4 — … / A4 ≈ 20×30 cm
 * et retourne la structure complète.
 */
export function normalizeFormatAlias(input: string): ResolvedFormatAlias | null {
  const raw = stripCommercialAliasSuffix(String(input ?? '').trim());
  if (!raw || /personnalis|autres|sur devis/i.test(raw)) return null;

  let matchedVia: ResolvedFormatAlias['matchedVia'] = 'iso';
  let code: string | null = null;

  // Code ISO explicite (A3+ / A4+ avant A3 / A4)
  if (/A3\+/i.test(raw) || /^SRA3\b/i.test(raw)) {
    code = 'A3+';
    matchedVia = 'iso';
  } else if (/A4\+/i.test(raw)) {
    code = 'A4+';
    matchedVia = 'iso';
  } else {
    const isoM = raw.match(/\b(A10|A9|A8|A7|A6|A5|A4|A3|A2|A1|A0|DL|B6|B5)\b/i);
    if (isoM) {
      code = isoM[1]!.toUpperCase();
      matchedVia = 'iso';
    }
  }

  // Mention ≈ 20×30 cm dans le libellé
  if (!code) {
    const approx = raw.match(/≈\s*(\d+)\s*[×x]\s*(\d+)\s*cm/i);
    if (approx) {
      const dims = sortPair(Number(approx[1]) * 10, Number(approx[2]) * 10);
      code = matchCommercialAliasByDims(dims[0], dims[1]);
      if (code) matchedVia = 'commercial-cm';
    }
  }

  // Dimensions libres
  if (!code) {
    const dims = parseDimsToSortedMm(raw);
    if (dims) {
      code = matchExactIsoByDims(dims[0], dims[1]);
      if (code) {
        matchedVia = 'exact-mm';
      } else {
        code = matchCommercialAliasByDims(dims[0], dims[1]);
        if (code) {
          matchedVia = dims[0] >= 80 && raw.toLowerCase().includes('mm')
            ? 'commercial-mm'
            : 'commercial-cm';
        }
      }
    }
  }

  if (!code) return null;

  const shortLabel = CANONICAL_ISO_FORMAT_LABELS[code] ?? code;
  const alias = FORMAT_COMMERCIAL_ALIASES[code];
  if (!alias) {
    return {
      canonicalFormat: code,
      exactDimensions: shortLabel.replace(/^.*?—\s*/, ''),
      commercialAlias: '',
      priceEquivalent: code,
      displayLabel: shortLabel,
      shortLabel,
      matchedVia,
    };
  }

  const displayLabel = `${shortLabel} (${alias.commercial} — tarif ${alias.priceEquivalent})`;
  return {
    canonicalFormat: code,
    exactDimensions: alias.exact,
    commercialAlias: alias.commercial,
    priceEquivalent: alias.priceEquivalent,
    displayLabel,
    shortLabel,
    matchedVia,
  };
}

/**
 * Alias de normalizeFormatAlias pour l’API demandée.
 */
export function normalizeFormatAliasInput(input: string): ResolvedFormatAlias | null {
  return normalizeFormatAlias(input);
}

/**
 * Prix : dims personnalisées proches d’un arrondi commercial → format équivalent.
 * Sinon null (laisser resolvePaperFormatForCustomSize / supérieur).
 */
export function resolvePriceEquivalentFromDims(
  widthMm: number,
  heightMm: number,
  tolMm = 10,
): { formatCode: string; reason: string } | null {
  const code = matchCommercialAliasByDims(widthMm, heightMm, tolMm);
  if (!code) return null;
  const alias = FORMAT_COMMERCIAL_ALIASES[code]!;
  return {
    formatCode: alias.priceEquivalent,
    reason: `${widthMm}×${heightMm} mm ≈ commercial ${alias.commercial} → tarif ${alias.priceEquivalent}`,
  };
}

/** Métadonnées Admin pour un chip format. */
export function buildFormatAdminMetadata(code: string): Record<string, unknown> | null {
  const alias = FORMAT_COMMERCIAL_ALIASES[code];
  if (!alias) return null;
  return {
    formatStandard: code,
    exactDimensions: alias.exact,
    commercialAlias: alias.commercial,
    priceEquivalent: alias.priceEquivalent,
    unit: 'mm',
    comment: `format commercial arrondi, tarif ${alias.priceEquivalent}`,
  };
}
