/**
 * Tri formats POS par taille réelle croissante (surface mm²).
 * Carrés intercalés (145×145 entre A6 et A5, 295×295 entre A4 et A3).
 * « Format personnalisé » toujours en dernier.
 */
const ISO_FORMAT_RANK: Record<string, number> = {
  A10: 10,
  A9: 20,
  A8: 30,
  A7: 40,
  A6: 50,
  DL: 55,
  B6: 58,
  A5: 60,
  B5: 65,
  A4: 70,
  'A4+': 75,
  A3: 80,
  'A3+': 85,
  SRA3: 85,
  A2: 90,
  A1: 100,
  A0: 110,
  '2A0': 120,
  '4A0': 130,
};

const STD_A_MM: Record<string, [number, number]> = {
  A10: [26, 37],
  A9: [37, 52],
  A8: [52, 74],
  A7: [74, 105],
  A6: [105, 148],
  A5: [148, 210],
  A4: [210, 297],
  'A4+': [225, 320],
  A3: [297, 420],
  'A3+': [320, 450],
  SRA3: [320, 450],
  A2: [420, 594],
  A1: [594, 841],
  A0: [841, 1189],
  '2A0': [1189, 1682],
  '4A0': [1682, 2378],
  DL: [99, 210],
  B6: [125, 176],
  B5: [176, 250],
};

function isCustomFormatLabel(label: string): boolean {
  return /personnalis/i.test(label);
}

/** Rang série A / DL / B — tie-breaker quand surfaces égales. */
export function formatIsoSortRank(label: string): number | null {
  const s = label.trim().replace(/\s*\(≈[^)]*\)\s*$/, '');
  if (!s || isCustomFormatLabel(s)) return null;
  if (/A3\+/i.test(s) || /\bSRA3\b/i.test(s)) return ISO_FORMAT_RANK['A3+']!;
  if (/A4\+/i.test(s)) return ISO_FORMAT_RANK['A4+']!;
  const m = s.match(/\b(4A0|2A0|A10|A9|A8|A7|A6|A5|A4|A3|A2|A1|A0|DL|B6|B5)\b/i);
  if (!m) return null;
  return ISO_FORMAT_RANK[m[1]!.toUpperCase()] ?? null;
}

/** Surface en mm² (ISO connus ou dims L×H, cm→mm). */
export function formatChipSortArea(label: string): number | null {
  const s = label.trim().replace(/\s*\(≈[^)]*\)\s*$/, '');
  if (!s || isCustomFormatLabel(s)) return null;

  const diam = s.match(/Ø\s*(\d+[,.]?\d*)\s*(cm|mm)?/i);
  if (diam) {
    let d = parseFloat(diam[1]!.replace(',', '.'));
    const unit = (diam[2] || 'mm').toLowerCase();
    if (unit === 'cm') d *= 10;
    return Math.PI * (d / 2) ** 2;
  }

  // Prefixe ISO : utiliser dims standard (évite de parser « A5 — 148×210 » comme 148×210 seul)
  if (/A3\+/i.test(s) || /\bSRA3\b/i.test(s)) {
    const std = STD_A_MM['A3+']!;
    return std[0] * std[1];
  }
  if (/A4\+/i.test(s)) {
    const std = STD_A_MM['A4+']!;
    return std[0] * std[1];
  }
  const isoM = s.match(/\b(4A0|2A0|A10|A9|A8|A7|A6|A5|A4|A3|A2|A1|A0|DL|B6|B5)\b/i);
  if (isoM) {
    const std = STD_A_MM[isoM[1]!.toUpperCase()];
    if (std) return std[0] * std[1];
  }

  const dim = s.match(/(\d+[,.]?\d*)\s*[×x]\s*(\d+[,.]?\d*)\s*(cm|mm|m)?/i);
  if (dim) {
    let w = parseFloat(dim[1]!.replace(',', '.'));
    let h = parseFloat(dim[2]!.replace(',', '.'));
    const unit = (dim[3] || 'mm').toLowerCase();
    const mult = unit === 'cm' ? 10 : unit === 'm' ? 1000 : 1;
    return w * mult * h * mult;
  }

  return null;
}

/**
 * Trie les formats du plus petit au plus grand (surface réelle).
 * Ex. A6 → 145×145 → A5 → A4 → 295×295 → A3 → A3+ → A2 → perso.
 */
export function sortFormatChipOptions(options: string[]): string[] {
  if (options.length <= 1) return options;

  const custom = options.filter(isCustomFormatLabel);
  const regular = options.filter((o) => !isCustomFormatLabel(o));

  const sorted = [...regular].sort((a, b) => {
    const areaA = formatChipSortArea(a);
    const areaB = formatChipSortArea(b);
    if (areaA != null && areaB != null && areaA !== areaB) return areaA - areaB;
    if (areaA != null && areaB == null) return -1;
    if (areaA == null && areaB != null) return 1;

    const rankA = formatIsoSortRank(a);
    const rankB = formatIsoSortRank(b);
    if (rankA != null && rankB != null && rankA !== rankB) return rankA - rankB;

    return options.indexOf(a) - options.indexOf(b);
  });

  return [...sorted, ...custom];
}

/** Alias demandé métier. */
export const sortFormatsForPOS = sortFormatChipOptions;
