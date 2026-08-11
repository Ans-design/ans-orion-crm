import { describe, expect, it } from 'vitest';
import { computeCaForecast, forecastSummary } from '@/lib/cockpit/ca-forecast';

describe('computeCaForecast', () => {
  it('projette le mois suivant via moyenne mobile 3 mois', () => {
    const monthly = [
      { name: 'janv.', ca: 100_000 },
      { name: 'févr.', ca: 200_000 },
      { name: 'mars', ca: 300_000 },
    ];
    const points = computeCaForecast(monthly);
    expect(points).toHaveLength(4);
    expect(points[3]?.projected).toBe(true);
    expect(points[3]?.value).toBe(200_000);
  });

  it('retourne vide si historique absent', () => {
    expect(computeCaForecast([])).toEqual([]);
  });
});

describe('forecastSummary', () => {
  it('calcule la tendance entre les deux derniers mois réels', () => {
    const points = computeCaForecast([
      { name: 'janv.', ca: 100_000 },
      { name: 'févr.', ca: 150_000 },
      { name: 'mars', ca: 200_000 },
    ]);
    const summary = forecastSummary(points);
    expect(summary.projectedCa).toBeGreaterThan(0);
    expect(summary.trendPct).toBe(33);
  });
});
