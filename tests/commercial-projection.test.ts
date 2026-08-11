import { describe, expect, it } from 'vitest';
import {
  buildCommercialProjection,
  computeCommercialProjectionHash,
  extractCoherenceMeta,
  mergeCoherenceIntoVariables,
} from '@/lib/pricing/commercial-projection';

describe('commercial projection hash (§11)', () => {
  const base = {
    articleId: 'flyer-a5',
    articleLabel: 'Flyer A5',
    family: 'print',
    calculationType: 'piece',
    saleUnit: 'pièce',
    prixBase: 1000,
    formula: { version: 3, expression: 'qty * unit', status: 'draft' },
    optionFieldKeys: ['finition', 'matiere'],
  };

  it('produces stable hash regardless of option key order', () => {
    const a = buildCommercialProjection(base);
    const b = buildCommercialProjection({
      ...base,
      optionFieldKeys: ['matiere', 'finition'],
    });
    expect(a.hash).toBe(b.hash);
    expect(a.hash).toHaveLength(32);
  });

  it('changes hash when expression changes', () => {
    const a = computeCommercialProjectionHash(buildCommercialProjection(base).payload);
    const b = computeCommercialProjectionHash(
      buildCommercialProjection({
        ...base,
        formula: { ...base.formula, expression: 'qty * unit * 1.1' },
      }).payload,
    );
    expect(a).not.toBe(b);
  });

  it('round-trips coherence meta in variables', () => {
    const { meta } = buildCommercialProjection(base);
    const merged = mergeCoherenceIntoVariables({ blocks: [] }, meta);
    expect(extractCoherenceMeta(merged)?.hash).toBe(meta.hash);
    expect((merged as { blocks: unknown[] }).blocks).toEqual([]);
  });
});
