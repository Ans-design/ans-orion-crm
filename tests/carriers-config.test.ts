import { describe, expect, it } from 'vitest';
import {
  normalizeCarriersConfig,
  DEFAULT_CARRIERS,
  carriersConfigSchema,
} from '@/lib/logistics/carriers-config';

describe('carriers-config', () => {
  it('fallback sur défauts si config invalide', () => {
    expect(normalizeCarriersConfig(null)).toEqual(DEFAULT_CARRIERS);
    expect(normalizeCarriersConfig({ foo: 1 })).toEqual(DEFAULT_CARRIERS);
  });

  it('masque les transporteurs inactive sans les supprimer du schéma', () => {
    const input = carriersConfigSchema.parse([
      { ...DEFAULT_CARRIERS[0], active: true },
      { ...DEFAULT_CARRIERS[1], active: false },
    ]);
    const visible = normalizeCarriersConfig(input);
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe(DEFAULT_CARRIERS[0].id);
  });
});
