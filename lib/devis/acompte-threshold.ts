import { parseDevisNotes } from '@/lib/devis-meta';

/** Ratio acompte requis (0–1) — source unique devis / workflow. */
export const DEFAULT_ACOMPTE_RATIO = 0.3;

export function getAcompteRatioFromDevisNotes(notes: string | null | undefined): number {
  const { meta } = parseDevisNotes(notes);
  if (meta?.modePaiement === 'Complet') return 1;
  const pct = meta?.avancePct ?? Math.round(DEFAULT_ACOMPTE_RATIO * 100);
  return Math.min(1, Math.max(0, pct / 100));
}

export function getRequiredAcompteAmount(devis: { totalTTC: number; notes?: string | null }): number {
  const ratio = getAcompteRatioFromDevisNotes(devis.notes);
  return Math.round(devis.totalTTC * ratio);
}

export function formatAcomptePctLabel(ratio: number): string {
  return `${Math.round(ratio * 100)} %`;
}
