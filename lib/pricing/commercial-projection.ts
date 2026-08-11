/**
 * Projection commerciale POS + hash de cohérence (§11).
 * Hash Node crypto = serveur uniquement. Méta client → commercial-projection-meta.ts.
 */
import { createHash } from 'crypto';
import type { CoherenceMeta } from '@/lib/pricing/commercial-projection-meta';

export {
  COHERENCE_META_KEY,
  type CoherenceMeta,
  extractCoherenceMeta,
  mergeCoherenceIntoVariables,
} from '@/lib/pricing/commercial-projection-meta';

export type CommercialProjectionPayload = {
  productId: string;
  publicationVersionId: number;
  label: string;
  family: string;
  calculationType: string;
  saleUnit: string;
  expression: string;
  optionFieldKeys: string[];
  callPriceHint: number | null;
  formulaStatus: string;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

export function computeCommercialProjectionHash(payload: CommercialProjectionPayload): string {
  const digest = createHash('sha256').update(stableStringify(payload)).digest('hex');
  return digest.slice(0, 32);
}

export function buildCommercialProjection(input: {
  articleId: string;
  articleLabel: string;
  family: string;
  calculationType: string;
  saleUnit: string;
  prixBase?: number | null;
  formula: { version: number; expression: string; status: string };
  optionFieldKeys: string[];
}): { payload: CommercialProjectionPayload; hash: string; meta: CoherenceMeta } {
  const payload: CommercialProjectionPayload = {
    productId: input.articleId,
    publicationVersionId: input.formula.version,
    label: input.articleLabel,
    family: input.family,
    calculationType: input.calculationType,
    saleUnit: input.saleUnit,
    expression: String(input.formula.expression ?? '').trim(),
    optionFieldKeys: [...input.optionFieldKeys].map((k) => k.trim()).filter(Boolean).sort(),
    callPriceHint: input.prixBase ?? null,
    formulaStatus: 'published',
  };
  const hash = computeCommercialProjectionHash(payload);
  const meta: CoherenceMeta = {
    hash,
    version: input.formula.version,
    at: new Date().toISOString(),
  };
  return { payload, hash, meta };
}
