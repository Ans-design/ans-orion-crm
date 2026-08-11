/** Helpers niveau consommables machine (HTML v29 consum-bar). */

export type ConsumableLevel = {
  pct: number;
  remaining: number;
  used: number;
  capacity: number;
  unit: string;
  label: string;
};

function parseQtyFraction(qty: string): { used: number; capacity: number } | null {
  const m = qty.trim().match(/^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const used = Number(m[1].replace(',', '.'));
  const capacity = Number(m[2].replace(',', '.'));
  if (!Number.isFinite(used) || !Number.isFinite(capacity) || capacity <= 0) return null;
  return { used, capacity };
}

export function resolveConsumableLevel(c: {
  qty?: string;
  used?: number;
  capacity?: number;
  unit?: string;
}): ConsumableLevel | null {
  let used = typeof c.used === 'number' && Number.isFinite(c.used) ? c.used : null;
  let capacity =
    typeof c.capacity === 'number' && Number.isFinite(c.capacity) && c.capacity > 0
      ? c.capacity
      : null;

  if ((used == null || capacity == null) && c.qty) {
    const frac = parseQtyFraction(c.qty);
    if (frac) {
      used = frac.used;
      capacity = frac.capacity;
    }
  }

  if (used == null || capacity == null || capacity <= 0) return null;

  const pct = Math.max(0, Math.min(100, Math.round(((capacity - used) / capacity) * 100)));
  const remaining = Math.max(0, capacity - used);
  const unit = c.unit?.trim() || '';
  return {
    pct,
    remaining,
    used,
    capacity,
    unit,
    label: unit
      ? `${remaining.toLocaleString('fr-FR')} / ${capacity.toLocaleString('fr-FR')} ${unit}`
      : `${remaining.toLocaleString('fr-FR')} / ${capacity.toLocaleString('fr-FR')}`,
  };
}

export function consumFillTone(pctRemaining: number): 'ok' | 'warn' | 'crit' {
  if (pctRemaining <= 20) return 'crit';
  if (pctRemaining <= 40) return 'warn';
  return 'ok';
}

export function utilFillTone(utilization: number): 'ok' | 'warn' | 'crit' {
  if (utilization > 85) return 'crit';
  if (utilization > 65) return 'warn';
  return 'ok';
}
