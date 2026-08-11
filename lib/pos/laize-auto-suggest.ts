import { parseLaizeLabelToCm } from '@/lib/grand-format/laize-utils';
import { cmToLaizeChipLabel, laizeChipToCm } from '@/lib/print/grand-format-laize-rules';

/** Retrouve le libellé chip POS correspondant à une laize recommandée (cm). */
export function resolveLaizeChipLabel(
  laizeCm: number,
  availableLabels: string[],
): string | null {
  if (!Number.isFinite(laizeCm) || laizeCm <= 0 || !availableLabels.length) return null;

  for (const label of availableLabels) {
    const cm = laizeChipToCm(label) ?? parseLaizeLabelToCm(label);
    if (cm != null && Math.abs(cm - laizeCm) <= 0.5) return label;
  }

  const candidates = [cmToLaizeChipLabel(laizeCm), `${laizeCm} cm`, `${Math.round(laizeCm)}cm`];
  for (const c of candidates) {
    if (availableLabels.includes(c)) return c;
  }

  return null;
}

/** Empreinte dimensions pour détecter un changement et ré-appliquer la laize optimale. */
export function dimensionFingerprint(config: Record<string, unknown>): string {
  const keys = [
    'format',
    'longueur_cm',
    'largeur_cm',
    'hauteur_cm',
    'longueur',
    'largeur',
    'hauteur',
    'custom_width',
    'custom_height',
  ];
  return keys.map((k) => `${k}:${String(config[k] ?? '')}`).join('|');
}
