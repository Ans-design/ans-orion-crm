import { describe, expect, it } from 'vitest';
import {
  entryGrandFormatPrix2026,
  GF_PRIX2026_M2,
} from '@/lib/data/prix-2026-grids/grand-format';
import {
  entryGrandFormatPrix2026 as archiveEntryGf,
  GF_PRIX2026_M2 as archiveGfMap,
} from '../archives/pricing/prix-2026-grids/grand-format';
import { getPrix2026EntryUnitPrice, articleHasPrix2026Grid } from '@/lib/data/prix-2026-grids';
import { resolvePosCatalogEntryPrice } from '@/lib/pos/pos-catalog-entry-price';
import { CATALOGUE } from '@/lib/data/catalogue';

describe('PRIX 2026 grand format — A0 = 1 m²', () => {
  it('runtime stub : pas de tarifs Excel ; archive conserve A0', () => {
    expect(entryGrandFormatPrix2026('gf-vinyl-blanc')).toBeNull();
    expect(Object.keys(GF_PRIX2026_M2)).toHaveLength(0);
    expect(archiveEntryGf('gf-vinyl-blanc')).toBe(20000);
    expect(archiveEntryGf('gf-oneway')).toBe(30000);
    expect(archiveEntryGf('gf-reflechissant')).toBe(46000);
    expect(archiveEntryGf('gf-frosted')).toBe(46000);
    expect(archiveEntryGf('gf-dosbleu')).toBe(23000);
    expect(archiveEntryGf('gf-tissu')).toBe(30000);
    expect(archiveEntryGf('gf-bache')).toBe(20000);
    expect(archiveEntryGf('gf-bache320')).toBe(30000);
    expect(archiveEntryGf('gf-photo')).toBe(25000);
    expect(archiveEntryGf('gf-pp')).toBe(20000);
    expect(archiveEntryGf('gf-pvc')).toBe(110000);
    expect(archiveEntryGf('gf-plexi')).toBe(200000);
  });

  it('catalogue parents GF : unit m² ; runtime POS sans Excel', () => {
    const gf = CATALOGUE.filter((a) => a.category === 'grand_format' && !a.name.startsWith('['));
    expect(gf.length).toBeGreaterThan(8);
    for (const a of gf) {
      if (a.id === 'gf-acrylic') continue;
      expect(a.unit, a.id).toBe('m²');
      expect(articleHasPrix2026Grid(a.id)).toBe(false);
      expect(getPrix2026EntryUnitPrice(a.id)).toBeNull();
      expect(resolvePosCatalogEntryPrice(a.id)).toBeNull();
      const archived = archiveGfMap[a.id]?.price;
      if (archived != null && a.prixDepart != null) {
        // Seed catalogue.ts peut encore mirroir l’archive (legacy seed) — hors runtime POS
        expect(a.prixDepart, a.id).toBe(archived);
      }
    }
  });
});
