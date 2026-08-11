import type { GrandFormatBillableResult } from '@/lib/grand-format/types';
import {
  formatClientDimensionsCm,
  parseGrandFormatDimensionsCm,
} from '@/lib/dimensions/grand-format-units';
import { cmToLaizeChipLabel } from '@/lib/print/grand-format-laize-rules';

export function gfCartSummaryLine(
  config: Record<string, unknown>,
  billable?: GrandFormatBillableResult | null,
): string | null {
  const stored = billable ?? (config._gfBillable as GrandFormatBillableResult | undefined);
  const laize = String(config.laize ?? config.laize_plaque ?? '').trim();
  const grammage = String(config.grammage ?? '').trim();
  const face = String(config.face ?? 'Recto seul').trim();
  const qty = Math.max(1, Number(config.qty ?? config.quantite ?? 1));

  const parts: string[] = [];

  if (stored && stored.clientLargeurCm > 0) {
    parts.push(`${stored.clientLargeurCm} × ${stored.clientHauteurCm} cm`);
    parts.push(`Surface réelle ${stored.surfaceReelleM2.toFixed(2)} m²`);
    if (stored.surfaceLaizeM2 > 0 && stored.surfaceLaizeM2 !== stored.surfaceReelleM2) {
      parts.push(`Surface laize ${stored.surfaceLaizeM2.toFixed(2)} m²`);
    }
  } else {
    const dims = parseGrandFormatDimensionsCm(config);
    if (dims) {
      parts.push(formatClientDimensionsCm(dims.longueurCm, dims.largeurCm));
    }
  }

  if (laize) parts.unshift(laize);
  else if (stored?.laizeLabel) parts.unshift(stored.laizeLabel);
  else if (stored?.laizeUtiliseeCm) parts.unshift(cmToLaizeChipLabel(stored.laizeUtiliseeCm));

  if (grammage) parts.unshift(grammage);
  if (face && face !== 'Recto seul') parts.push(face);

  parts.push(`Qté ${qty}`);

  return parts.length ? parts.join(' — ') : null;
}

export function gfWorkOrderLines(
  config: Record<string, unknown>,
  billable?: GrandFormatBillableResult | null,
): string[] {
  const ev = billable ?? (config._gfBillable as GrandFormatBillableResult | undefined);
  if (!ev) return [];

  const qty = Math.max(1, Number(config.qty ?? config.quantite ?? 1));
  const lines: string[] = [];

  if (ev.clientLargeurCm > 0) {
    lines.push(`Dimensions : ${ev.clientLargeurCm} × ${ev.clientHauteurCm} cm`);
  }
  if (ev.laizeLabel) lines.push(`Laize : ${ev.laizeLabel}`);
  lines.push(`Surface réelle unitaire : ${ev.surfaceReelleM2.toFixed(2)} m²`);
  if (ev.surfaceLaizeM2 > 0) {
    lines.push(`Surface laize unitaire : ${ev.surfaceLaizeM2.toFixed(2)} m²`);
  }
  if (qty > 1) {
    lines.push(`Quantité : ${qty}`);
    lines.push(`Surface réelle totale : ${(ev.surfaceReelleM2 * qty).toFixed(2)} m²`);
    lines.push(`Surface laize totale : ${(ev.surfaceLaizeM2 * qty).toFixed(2)} m²`);
  }
  if (ev.orientation) lines.push(`Orientation : ${ev.orientation}`);
  const face = String(config.face ?? 'Recto seul');
  lines.push(`Impression : ${face}`);

  return lines;
}
