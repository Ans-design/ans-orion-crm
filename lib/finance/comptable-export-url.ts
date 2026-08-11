import { resolveDateRange, type ModuleDateFilter, DEFAULT_DATE_FILTER } from '@/lib/date-filter';

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Plage par défaut : 1er du mois courant → aujourd'hui. */
export function defaultComptableExportRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: fmtDate(from), to: fmtDate(now) };
}

export function resolveComptableExportRange(
  filter?: ModuleDateFilter | null,
): { from: string; to: string } {
  const effective = filter ?? DEFAULT_DATE_FILTER;
  const { from, to } = resolveDateRange(effective);
  if (from && to) return { from: fmtDate(from), to: fmtDate(to) };
  return defaultComptableExportRange();
}

import type { ComptableExportFormat } from '@/lib/finance/comptable-dgi-export';

export function buildComptableExportUrl(
  range: { from: string; to: string },
  format: ComptableExportFormat = 'standard',
): string {
  const qs = new URLSearchParams({ from: range.from, to: range.to, format });
  return `/api/finance/export/comptable?${qs}`;
}
