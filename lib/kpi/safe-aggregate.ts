/**
 * Tentative d’agrégat — ne transforme jamais une erreur en zéro FRESH.
 */

export type AggregateResult<T> =
  | { ok: true; value: T }
  | { ok: false; errorId: string };

export async function tryAggregate<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<AggregateResult<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    const errorId = `kpi-${label}-${Date.now().toString(36)}`;
    console.error('[kpi-aggregate]', errorId, label, err instanceof Error ? err.message : err);
    return { ok: false, errorId };
  }
}

/** Pour compteurs : ERROR → null côté envelope ; ne pas utiliser 0. */
export function countOrNull(r: AggregateResult<number>): number | null {
  return r.ok ? r.value : null;
}
