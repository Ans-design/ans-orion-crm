import { describe, expect, it } from 'vitest';
import {
  listCanonicalGrandFormatPosIds,
} from '@/lib/services/grand-format-admin-backfill.service';
import {
  isRedundantGrandFormatPosCard,
  REDUNDANT_GF_MATERIAL_IDS,
} from '@/lib/pos/grand-format-redundant';

describe('grand-format-admin-backfill', () => {
  it('liste des IDs canoniques POS Grand Format non vides', () => {
    const ids = listCanonicalGrandFormatPosIds();
    expect(ids.length).toBeGreaterThan(5);
    expect(ids.some((id) => /bache|vinyle|pvc|canvas|plexi/i.test(id))).toBe(true);
  });

  it('exclut les alias redondants (pas de doublons bâche440 / acrylic)', () => {
    const ids = listCanonicalGrandFormatPosIds();
    for (const redundant of Object.keys(REDUNDANT_GF_MATERIAL_IDS)) {
      expect(ids).not.toContain(redundant);
    }
    expect(ids).not.toContain('gf-bache440');
    expect(ids).not.toContain('gf-acrylic');
  });

  it('chaque id est unique', () => {
    const ids = listCanonicalGrandFormatPosIds();
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ne marque pas les matières canoniques gf-* comme redondantes', () => {
    for (const id of listCanonicalGrandFormatPosIds()) {
      expect(isRedundantGrandFormatPosCard(id, id)).toBe(false);
    }
    expect(isRedundantGrandFormatPosCard('Papier Photo GF 140G', 'gf-photo')).toBe(false);
    expect(isRedundantGrandFormatPosCard('Bâche', 'gf-bache')).toBe(false);
    expect(isRedundantGrandFormatPosCard('Acrylic / Plexiglas', 'gf-plexi')).toBe(false);
  });

  it('marque encore les anciens IDs Excel redondants', () => {
    expect(isRedundantGrandFormatPosCard('Bâche A0', 'GF001')).toBe(true);
    expect(isRedundantGrandFormatPosCard('Photo grand format', 'GF011')).toBe(true);
  });
});
