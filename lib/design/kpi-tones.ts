import { ORION_COLORS } from './tokens';

/** Tons sémantiques KPI — info = bleu sémantique (#2563EB), ≠ brand */
export const KPI_TONES = {
  brand: ORION_COLORS.red500,
  pink: ORION_COLORS.pink500,
  gold: ORION_COLORS.gold500,
  success: ORION_COLORS.success,
  warning: ORION_COLORS.warning,
  danger: ORION_COLORS.danger,
  info: '#2563EB',
  neutral: ORION_COLORS.plum700,
} as const;

export type KpiTone = keyof typeof KPI_TONES;

export function kpiToneColor(tone: KpiTone): string {
  return KPI_TONES[tone];
}
