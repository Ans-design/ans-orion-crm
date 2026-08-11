import { describe, it, expect } from 'vitest';
import { resolveChipOptions } from '@/lib/pos/admin-chip-filter';
import type { ChipAdminEntry } from '@/lib/admin-config/types';

const baseChip = (over: Partial<ChipAdminEntry>): ChipAdminEntry => ({
  id: 'fly-std:format:a5',
  scope: 'article',
  productId: 'fly-std',
  blockKey: 'Format',
  fieldKey: 'format',
  optionKey: 'a5',
  label: 'A5 — 148×210 mm',
  order: 10,
  visibility: 'ACTIVE',
  priceImpact: 0,
  affectsStock: false,
  affectsProduction: true,
  affectsDelay: false,
  required: false,
  defaultSelected: false,
  rolesVisible: [],
  compatibleWith: [],
  incompatibleWith: [],
  source: 'catalogue',
  ...over,
});

describe('admin-chip-filter', () => {
  it('hides HIDDEN chips', () => {
    const chips = {
      a: baseChip({ label: 'A4 — 210×297 mm', visibility: 'HIDDEN', optionKey: 'a4' }),
    };
    const out = resolveChipOptions('format', ['A5 — 148×210 mm', 'A4 — 210×297 mm'], chips);
    expect(out.map((o) => o.label)).toEqual(['A5 — 148×210 mm']);
  });

  it('greys DISABLED_VISIBLE chips', () => {
    const chips = {
      a: baseChip({ label: 'Format personnalisé', visibility: 'DISABLED_VISIBLE', optionKey: 'custom' }),
    };
    const out = resolveChipOptions('format', ['Format personnalisé'], chips);
    expect(out[0].greyed).toBe(true);
    expect(out[0].selectable).toBe(false);
  });

  it('does not expose recommended styling data', () => {
    const chips = {
      a: baseChip({ label: 'Coins droits', fieldKey: 'coins', defaultSelected: true }),
    };
    const out = resolveChipOptions('coins', ['Coins droits', 'Coins arrondis'], chips);
    expect(out[0]).toEqual({ label: 'Coins droits', selectable: true, greyed: false });
    expect('recommended' in out[0]).toBe(false);
  });
});
