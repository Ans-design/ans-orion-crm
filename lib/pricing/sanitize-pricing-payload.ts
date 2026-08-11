import { canViewMargin } from '@/lib/auth/margin-access';

const SENSITIVE_TOP_KEYS = new Set([
  'margin',
  'unitCost',
  'unitCostEst',
  'coutRevient',
  'coutUnitaire',
  'purchasePrice',
  'costSource',
  'marginAmount',
  'marginRate',
  'marginRatePct',
  'coefficient',
  'coeffMarge',
  'prixAchat',
]);

const SENSITIVE_SNAPSHOT_KEYS = new Set([
  'unitCost',
  'unitCostEst',
  'purchasePrice',
  'coutRevient',
  'coutMatiere',
  'materialCost',
  'costPerM2',
  'margin',
  'marge',
  'coefficient',
  'coeffMarge',
  'prixAchat',
]);

function scrubRecord(input: Record<string, unknown>, keys: Set<string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (keys.has(k)) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Retire coûts / marges / coefficients des payloads pricing si pas pos:view_margin.
 * Omet les champs (pas null/0) — Lot A2 V4.
 */
export function sanitizePricingPayloadForRole<T extends Record<string, unknown>>(
  payload: T,
  role: string,
): T {
  if (canViewMargin(role)) return payload;

  const { margin: _m, formula: _f, dynamicFormula: _df, ...rest } = payload as Record<string, unknown>;
  const cleaned = scrubRecord(rest, SENSITIVE_TOP_KEYS);

  if (cleaned.snapshot && typeof cleaned.snapshot === 'object' && !Array.isArray(cleaned.snapshot)) {
    cleaned.snapshot = scrubRecord(
      cleaned.snapshot as Record<string, unknown>,
      SENSITIVE_SNAPSHOT_KEYS,
    );
  }

  if (cleaned.result && typeof cleaned.result === 'object' && !Array.isArray(cleaned.result)) {
    const resultObj = cleaned.result as Record<string, unknown>;
    const scrubbedResult = scrubRecord(resultObj, SENSITIVE_TOP_KEYS);
    if (scrubbedResult.snapshot && typeof scrubbedResult.snapshot === 'object' && !Array.isArray(scrubbedResult.snapshot)) {
      scrubbedResult.snapshot = scrubRecord(
        scrubbedResult.snapshot as Record<string, unknown>,
        SENSITIVE_SNAPSHOT_KEYS,
      );
    }
    delete scrubbedResult.formula;
    delete scrubbedResult.dynamicFormula;
    cleaned.result = scrubbedResult;
  }

  return cleaned as T;
}
