/** Projection CA simple — moyenne mobile 3 mois + point suivant estimé. */

export type CaForecastPoint = {
  label: string;
  value: number;
  /** true = mois projeté (non encaissé) */
  projected?: boolean;
};

export function computeCaForecast(
  monthlyCa: { name: string; ca: number }[],
): CaForecastPoint[] {
  const history = monthlyCa.map((m) => ({
    label: m.name,
    value: Math.max(0, Math.round(m.ca)),
    projected: false as const,
  }));

  if (history.length === 0) return [];

  const recent = history.slice(-3);
  const avg =
    recent.length > 0
      ? Math.round(recent.reduce((s, p) => s + p.value, 0) / recent.length)
      : history[history.length - 1]!.value;

  const lastMonth = history[history.length - 1]!.label;
  const nextLabel = nextMonthLabel(lastMonth);

  return [
    ...history,
    { label: nextLabel, value: avg, projected: true },
  ];
}

function nextMonthLabel(lastLabel: string): string {
  const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jui', 'aoû', 'sep', 'oct', 'nov', 'déc'];
  const lower = lastLabel.toLowerCase();
  const idx = months.findIndex((m) => lower.startsWith(m));
  if (idx >= 0) {
    return months[(idx + 1) % 12]!.charAt(0).toUpperCase() + months[(idx + 1) % 12]!.slice(1) + ' (proj.)';
  }
  return 'M+1 (proj.)';
}

export function forecastSummary(points: CaForecastPoint[]): {
  nextMonthLabel: string;
  projectedCa: number;
  trendPct: number | null;
} {
  const projected = points.filter((p) => p.projected);
  const history = points.filter((p) => !p.projected);
  const next = projected[0];
  if (!next || history.length < 2) {
    return {
      nextMonthLabel: next?.label ?? '—',
      projectedCa: next?.value ?? 0,
      trendPct: null,
    };
  }
  const prev = history[history.length - 1]!.value;
  const prior = history[history.length - 2]!.value;
  const trendPct = prior > 0 ? Math.round(((prev - prior) / prior) * 100) : null;
  return {
    nextMonthLabel: next.label,
    projectedCa: next.value,
    trendPct,
  };
}
