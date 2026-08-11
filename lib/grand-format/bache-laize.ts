/** Normalisation laize bâche — 1m, 1m40, 1m60, 1m80, 2m40, 3m20. */

import { parseLaizeLabelToCm, laizeCmToChipLabel } from '@/lib/grand-format/laize-utils';

const LAIZE_NORMALIZE: Record<string, string> = {
  '100cm': '1m',
  '1m': '1m',
  '1m00': '1m',
  '140cm': '1m40',
  '140 cm': '1m40',
  '1m40': '1m40',
  '160cm': '1m60',
  '160 cm': '1m60',
  '1m60': '1m60',
  '180cm': '1m80',
  '180 cm': '1m80',
  '1m80': '1m80',
  '240cm': '2m40',
  '240 cm': '2m40',
  '2m40': '2m40',
  '320cm': '3m20',
  '320 cm': '3m20',
  '3m20': '3m20',
};

export function normalizeBacheLaizeLabel(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  const key = s.toLowerCase().replace(/\s+/g, '');
  for (const [k, v] of Object.entries(LAIZE_NORMALIZE)) {
    if (k.replace(/\s+/g, '') === key) return v;
  }
  const cm = parseLaizeLabelToCm(s);
  if (cm === 100) return '1m';
  if (cm === 140) return '1m40';
  if (cm === 160) return '1m60';
  if (cm === 180) return '1m80';
  if (cm === 240) return '2m40';
  if (cm === 320) return '3m20';
  return s;
}

export function laizeLabelToM(label: string): number | null {
  const norm = normalizeBacheLaizeLabel(label);
  if (norm === '1m') return 1;
  if (norm === '1m40') return 1.4;
  if (norm === '1m60') return 1.6;
  if (norm === '1m80') return 1.8;
  if (norm === '2m40') return 2.4;
  if (norm === '3m20') return 3.2;
  const cm = parseLaizeLabelToCm(label);
  if (cm != null && cm > 0) return cm / 100;
  const m = parseFloat(String(label).replace(',', '.'));
  if (Number.isFinite(m) && m > 0 && m <= 5) return m;
  return null;
}

export function parseLaizeMFromConfig(config: Record<string, unknown>): number | null {
  const laize = String(config.laize ?? '').trim();
  if (laize.toLowerCase().includes('autre')) {
    const customCm = parseFloat(String(config.laize_autre ?? ''));
    if (customCm > 0) return customCm / 100;
    return null;
  }
  if (!laize) {
    const customCm = parseFloat(String(config.laize_autre ?? ''));
    if (customCm > 0) return customCm / 100;
    return null;
  }
  return laizeLabelToM(laize);
}

export function laizeMToChipLabel(m: number): string {
  if (Math.abs(m - 1) < 0.01) return '1m';
  if (Math.abs(m - 1.4) < 0.05) return '1m40';
  if (Math.abs(m - 1.6) < 0.05) return '1m60';
  if (Math.abs(m - 1.8) < 0.05) return '1m80';
  if (Math.abs(m - 2.4) < 0.05) return '2m40';
  if (Math.abs(m - 3.2) < 0.05) return '3m20';
  return laizeCmToChipLabel(Math.round(m * 100));
}
