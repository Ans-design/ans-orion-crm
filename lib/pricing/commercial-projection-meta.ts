/**
 * Méta cohérence commerciale — sûr côté client (pas de Node crypto).
 */
export const COHERENCE_META_KEY = '_coherence' as const;

export type CoherenceMeta = {
  hash: string;
  version: number;
  at: string;
};

export function extractCoherenceMeta(variables: unknown): CoherenceMeta | null {
  if (!variables || typeof variables !== 'object' || Array.isArray(variables)) return null;
  const raw = (variables as Record<string, unknown>)[COHERENCE_META_KEY];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.hash !== 'string' || typeof r.version !== 'number') return null;
  return {
    hash: r.hash,
    version: r.version,
    at: typeof r.at === 'string' ? r.at : '',
  };
}

/** Fusionne le meta de cohérence dans variables Json sans perdre le reste. */
export function mergeCoherenceIntoVariables(
  variables: unknown,
  meta: CoherenceMeta,
): Record<string, unknown> {
  const base =
    variables && typeof variables === 'object' && !Array.isArray(variables)
      ? { ...(variables as Record<string, unknown>) }
      : {};
  base[COHERENCE_META_KEY] = meta;
  return base;
}
