/**
 * Équivalence formats ISO / A4 pour tarification packaging.
 * surfaceA4 = 0.210 × 0.297 = 0.06237 m²
 */

export const SURFACE_A4_M2 = 0.210 * 0.297; // 0.06237

/** Facteurs ISO : A4=1, A3=2, A2=4, A1=8, A0=16 */
export const ISO_A4_FACTORS: Record<string, number> = {
  A4: 1,
  A3: 2,
  A2: 4,
  A1: 8,
  A0: 16,
  '2A0': 32,
  '4A0': 64,
};

export type PackagingArrondiMode = 'exact' | 'ceil_a4' | 'ceil_iso_format';

export function isoFormatFactor(formatLabel: string): number | null {
  const key = String(formatLabel ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  if (ISO_A4_FACTORS[key] != null) return ISO_A4_FACTORS[key]!;
  const m = key.match(/^(A[0-4]|2A0|4A0)/);
  if (m && ISO_A4_FACTORS[m[1]!] != null) return ISO_A4_FACTORS[m[1]!]!;
  return null;
}

export function surfaceToA4Equivalent(
  surfaceM2: number,
  mode: PackagingArrondiMode = 'exact',
): { equivA4: number; formatEquivalent: string } {
  if (!(surfaceM2 > 0)) return { equivA4: 0, formatEquivalent: '—' };

  if (mode === 'ceil_iso_format') {
    const exact = surfaceM2 / SURFACE_A4_M2;
    const order = ['A4', 'A3', 'A2', 'A1', 'A0', '2A0', '4A0'] as const;
    for (const f of order) {
      const factor = ISO_A4_FACTORS[f]!;
      if (exact <= factor + 1e-9) {
        return { equivA4: factor, formatEquivalent: f };
      }
    }
    return { equivA4: ISO_A4_FACTORS['4A0']!, formatEquivalent: '4A0' };
  }

  const raw = surfaceM2 / SURFACE_A4_M2;
  if (mode === 'ceil_a4') {
    const ceil = Math.max(1, Math.ceil(raw - 1e-9));
    return { equivA4: ceil, formatEquivalent: `~${ceil}×A4` };
  }

  // exact
  const round2 = Math.round(raw * 100) / 100;
  return { equivA4: round2, formatEquivalent: `~${round2}×A4` };
}

export function resolveFormatOverride(
  formatOverride: string | null | undefined,
): { equivA4: number; formatEquivalent: string } | null {
  const raw = String(formatOverride ?? '').trim();
  if (!raw || /^auto$/i.test(raw) || /personnalis|sur mesure/i.test(raw)) return null;
  const factor = isoFormatFactor(raw);
  if (factor == null) return null;
  const label = raw.toUpperCase().replace(/\s+/g, '');
  return { equivA4: factor, formatEquivalent: label.startsWith('A') || label.includes('A0') ? label : raw };
}

/** Surface tarif (m²) depuis L × l en mm — format personnalisé packaging. */
export function surfaceM2FromFormatEqMm(
  longueurMm: unknown,
  largeurMm: unknown,
): number | null {
  const L = typeof longueurMm === 'number' ? longueurMm : parseFloat(String(longueurMm ?? ''));
  const W = typeof largeurMm === 'number' ? largeurMm : parseFloat(String(largeurMm ?? ''));
  if (!Number.isFinite(L) || !Number.isFinite(W) || L <= 0 || W <= 0) return null;
  return (L * W) / 1_000_000;
}
