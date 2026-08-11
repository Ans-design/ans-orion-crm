/**
 * Limites formats par matière — Admin/Excel + POS (chips grisés).
 */
export type MaterialFormatLimitLike = {
  materialKey: string;
  materialLabel: string;
  formatMax: string | null;
  widthMaxMm: number | null;
  heightMaxMm: number | null;
  unit: 'mm' | 'cm';
  messagePos: string;
  active?: boolean;
  details?: string | null;
};

/** Seed métier — Offset/PCM/PCB ≤ A0 ; Glossy ≤ A3 ; Texturé/Toile/PVC ≤ A4 ; Plexi/PVC rigide ≤ 2400×1200. */
export const DEFAULT_MATERIAL_FORMAT_LIMITS: MaterialFormatLimitLike[] = [
  { materialKey: 'offset', materialLabel: 'Offset', formatMax: 'A0', widthMaxMm: 841, heightMaxMm: 1189, unit: 'mm', messagePos: 'Format non disponible pour cette matière', details: 'max A0' },
  { materialKey: 'standard', materialLabel: 'Standard / Offset', formatMax: 'A0', widthMaxMm: 841, heightMaxMm: 1189, unit: 'mm', messagePos: 'Format non disponible pour cette matière' },
  { materialKey: 'pcm', materialLabel: 'PCM', formatMax: 'A0', widthMaxMm: 841, heightMaxMm: 1189, unit: 'mm', messagePos: 'Format non disponible pour cette matière' },
  { materialKey: 'pcb', materialLabel: 'PCB', formatMax: 'A0', widthMaxMm: 841, heightMaxMm: 1189, unit: 'mm', messagePos: 'Format non disponible pour cette matière' },
  { materialKey: 'glossy', materialLabel: 'Glossy', formatMax: 'A3', widthMaxMm: 297, heightMaxMm: 420, unit: 'mm', messagePos: 'Format non disponible pour cette matière' },
  { materialKey: 'texture', materialLabel: 'Texturé', formatMax: 'A4', widthMaxMm: 210, heightMaxMm: 297, unit: 'mm', messagePos: 'Format non disponible pour cette matière' },
  { materialKey: 'toile_fin', materialLabel: 'Toile fin', formatMax: 'A4', widthMaxMm: 210, heightMaxMm: 297, unit: 'mm', messagePos: 'Format non disponible pour cette matière' },
  { materialKey: 'pvc_opaque', materialLabel: 'PVC opaque', formatMax: 'A4', widthMaxMm: 210, heightMaxMm: 297, unit: 'mm', messagePos: 'Format non disponible pour cette matière' },
  { materialKey: 'pvc_transl', materialLabel: 'PVC translucide', formatMax: 'A4', widthMaxMm: 210, heightMaxMm: 297, unit: 'mm', messagePos: 'Format non disponible pour cette matière' },
  { materialKey: 'invitation', materialLabel: 'Papier spécial invitation', formatMax: 'A0', widthMaxMm: 841, heightMaxMm: 1189, unit: 'mm', messagePos: 'Format non disponible pour cette matière' },
  { materialKey: 'plexiglass', materialLabel: 'Plexiglass', formatMax: null, widthMaxMm: 2400, heightMaxMm: 1200, unit: 'mm', messagePos: 'Format non disponible pour cette matière (max 2400×1200 mm)' },
  { materialKey: 'pvc_rigide', materialLabel: 'PVC rigide', formatMax: null, widthMaxMm: 2400, heightMaxMm: 1200, unit: 'mm', messagePos: 'Format non disponible pour cette matière (max 2400×1200 mm)' },
  { materialKey: 'acrylic', materialLabel: 'Acrylic', formatMax: null, widthMaxMm: 2400, heightMaxMm: 1200, unit: 'mm', messagePos: 'Format non disponible pour cette matière (max 2400×1200 mm)' },
];

const FORMAT_RANK: Record<string, number> = {
  A10: 1, A9: 2, A8: 3, A7: 4, A6: 5, DL: 6, A5: 7, A4: 8, 'A4+': 9,
  A3: 10, 'A3+': 11, A2: 12, A1: 13, A0: 14,
};

let cachedLimits: MaterialFormatLimitLike[] = DEFAULT_MATERIAL_FORMAT_LIMITS;

export function setMaterialFormatLimitsRuntime(rows: MaterialFormatLimitLike[] | null) {
  cachedLimits = rows?.length ? rows : DEFAULT_MATERIAL_FORMAT_LIMITS;
}

export function getMaterialFormatLimits(): MaterialFormatLimitLike[] {
  return cachedLimits.filter((r) => r.active !== false);
}

export function findMaterialFormatLimit(
  matiere: string,
  limits: MaterialFormatLimitLike[] = getMaterialFormatLimits(),
): MaterialFormatLimitLike | null {
  const m = matiere.toLowerCase().trim();
  if (!m) return null;
  return (
    limits.find((l) => l.active !== false && (
      m === l.materialLabel.toLowerCase()
      || m.includes(l.materialKey.replace(/_/g, ' '))
      || l.materialLabel.toLowerCase().includes(m)
      || m.includes(l.materialLabel.toLowerCase())
    ))
    ?? null
  );
}

function formatRank(code: string): number | null {
  const k = code.toUpperCase().replace(/\s/g, '');
  if (k.includes('A3+') || k === 'SRA3') return FORMAT_RANK['A3+']!;
  if (k.includes('A4+')) return FORMAT_RANK['A4+']!;
  const m = k.match(/\b(A10|A9|A8|A7|A6|A5|A4|A3|A2|A1|A0|DL)\b/);
  return m ? (FORMAT_RANK[m[1]!] ?? null) : null;
}

/** True si le format chip est autorisé pour la matière. */
export function isFormatAllowedForMaterial(
  matiere: string,
  formatLabel: string,
  widthMm?: number,
  heightMm?: number,
): { allowed: boolean; reason?: string } {
  const limit = findMaterialFormatLimit(matiere);
  if (!limit) return { allowed: true };

  const isCustom = /personnalis/i.test(formatLabel);

  // Formats ISO : comparer au formatMax (sauf personnalisé)
  if (!isCustom && limit.formatMax) {
    const maxR = formatRank(limit.formatMax);
    const fmtR = formatRank(formatLabel);
    if (maxR != null && fmtR != null && fmtR > maxR) {
      return { allowed: false, reason: limit.messagePos };
    }
  }

  // Dimensions mm (personnalisé ou contrôle surface max Plexi/PVC)
  if (limit.widthMaxMm != null && limit.heightMaxMm != null && widthMm && heightMm) {
    const [a, b] = widthMm <= heightMm ? [widthMm, heightMm] : [heightMm, widthMm];
    const [mw, mh] = limit.widthMaxMm <= limit.heightMaxMm
      ? [limit.widthMaxMm, limit.heightMaxMm]
      : [limit.heightMaxMm, limit.widthMaxMm];
    if (a > mw + 0.5 || b > mh + 0.5) {
      return { allowed: false, reason: limit.messagePos };
    }
  }

  return { allowed: true };
}

export function filterFormatsByMaterialLimit(
  matiere: string,
  options: string[],
): string[] {
  return options.filter((o) => isFormatAllowedForMaterial(matiere, o).allowed || /personnalis/i.test(o));
}
