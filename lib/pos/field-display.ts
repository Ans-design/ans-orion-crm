import type { ConfigField } from '@/lib/data/config-types';
import { formatCornerRoundingSummary, parseCornerRounding } from '@/lib/finition/corner-rounding';
import { parseBacheEyelets } from '@/lib/grand-format/bache-eyelets';
import { isCustomFormatChipValue, resolveDisplayFormatLabel } from '@/lib/pos/generated-format-label';

/** Affichage synthèse POS pour un champ configurateur. */
export function formatPosFieldDisplay(
  field: ConfigField,
  val: unknown,
  config?: Record<string, unknown>,
): string {
  if (
    config
    && (field.key === 'format' || field.key === 'dimension' || field.key === 'format_marquage' || field.key === 'diametre' || field.key === 'taille')
    && isCustomFormatChipValue(val)
  ) {
    return resolveDisplayFormatLabel(config);
  }
  if (field.type === 'corner_rounding') {
    return formatCornerRoundingSummary(parseCornerRounding(val ?? config?.cornerRounding));
  }
  if (field.type === 'bache_eyelets') {
    const data = parseBacheEyelets(val);
    if (!data.mode || data.mode === 'Aucun') return 'Aucun';
    if (data.mode === 'Nombre personnalisé') {
      const n = data.customCount ?? data.count ?? 0;
      return n > 0 ? `${data.mode} — ${n} œillets` : data.mode;
    }
    if (data.mode === 'Placement manuel') {
      const n = Array.isArray(data.positions) ? data.positions.length : 0;
      return n > 0 ? `${data.mode} — ${n} emplacements` : data.mode;
    }
    return data.mode;
  }
  if (field.type === 'size_qty_table') {
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      const entries = Object.entries(val as Record<string, number>).filter(([, q]) => (q || 0) > 0);
      if (entries.length) return entries.map(([s, q]) => `${s}×${q}`).join(', ');
    }
    return 'non choisi';
  }
  if (Array.isArray(val)) return val.length ? val.join(', ') : 'non choisi';
  if (field.type === 'number') {
    if (val === '' || val === undefined || val === null) return 'non choisi';
    const n = typeof val === 'number' ? val : parseFloat(String(val));
    if (!Number.isFinite(n)) return 'non choisi';
    if (field.key === 'qty' || field.key === 'quantite') {
      return `${n} pièce${n > 1 ? 's' : ''}`;
    }
    if (field.suffix) return `${n} ${field.suffix}`;
    return String(n);
  }
  if (typeof val === 'object' && val !== null) {
    return '—';
  }
  if (
    field.key === 'grammage'
    && config
    && String(config.matiere ?? '').trim().toLowerCase() === 'toile fin'
    && (val === 'Blanc' || val === 'Beige')
  ) {
    return `Base toile : ${val}`;
  }
  return String(val);
}
