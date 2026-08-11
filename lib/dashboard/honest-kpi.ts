/**
 * Lecture honnête des KPI dashboard.
 * - Erreur / aucune donnée → null (UI = « Indisponible »)
 * - Clé absente en mode lite → null (pas encore calculée)
 * - 0 calculé → 0 (état vide métier, pas une erreur)
 */

export type HonestKpiSource = {
  kpis: Record<string, number | undefined | null>;
  /** true si aucun payload exploitable (erreur totale). */
  unavailable: boolean;
  /** Mode résumé : clés absentes = non calculées. */
  lite?: boolean;
};

export function readHonestKpi(
  source: HonestKpiSource,
  ...keys: string[]
): number | null {
  if (source.unavailable) return null;
  for (const key of keys) {
    if (!(key in source.kpis)) continue;
    const raw = source.kpis[key];
    if (raw == null || Number.isNaN(Number(raw))) continue;
    return Number(raw);
  }
  if (source.lite) return null;
  return 0;
}
