import { describe, expect, it } from 'vitest';
import {
  BINDING_LABELS,
  computePhysicalSheets,
  getBindingDetail,
  getBindingDetailFromConfig,
  grammageToBand,
  LIVRES_RELIURE_BY_TYPE,
  parsePagesFromConfig,
} from '@/lib/data/binding-catalog';
import {
  BOOK_COVER_WEIGHTS,
  BOOK_INTERIOR_WEIGHTS,
} from '@/lib/data/book-material-catalog';
import { LIVRES_TYPES } from '@/lib/pos/livres-catalog';

describe('book-material-catalog', () => {
  it('aligne grammages intérieur sur bloc-note (Offset, PCM, invitation < 300g)', () => {
    expect(BOOK_INTERIOR_WEIGHTS.Offset).toEqual(['70g', '80g', '90g', 'Autres']);
    expect(BOOK_INTERIOR_WEIGHTS.PCM).toContain('80g');
    const invitation = BOOK_INTERIOR_WEIGHTS['Papier spécial invitation'] ?? [];
    expect(invitation).toContain('250g');
    expect(invitation).not.toContain('300g');
  });

  it('aligne grammages couverture PCB', () => {
    expect(BOOK_COVER_WEIGHTS.PCB).toEqual(
      expect.arrayContaining(['250g', '300g', '350g']),
    );
  });
});

describe('binding-catalog', () => {
  it('couvre tous les types livres pour reliure', () => {
    for (const t of LIVRES_TYPES) {
      expect(LIVRES_RELIURE_BY_TYPE[t]?.length).toBeGreaterThan(0);
    }
  });

  it('piqûre exige multiple de 4 pages', () => {
    const bad = getBindingDetail(BINDING_LABELS.PIQURE, 30, '80');
    expect(bad.compatible).toBe(false);
    expect(bad.summary).toMatch(/multiple de 4/);
  });

  it('piqûre 32p @ 80g retourne agrafe 23/008', () => {
    const d = getBindingDetail(BINDING_LABELS.PIQURE, 32, '80');
    expect(d.compatible).toBe(true);
    expect(d.reference).toBe('23/008');
    expect(d.dimensionMm).toBe('8mm');
  });

  it('spirale plastique 48p @ 80g retourne diamètre mm et pouces', () => {
    const d = getBindingDetail(BINDING_LABELS.SPIRALE_PLASTIQUE, 48, '80');
    expect(d.compatible).toBe(true);
    expect(d.dimensionMm).toMatch(/mm/);
    expect(d.dimensionInch).toMatch(/"/);
    expect(d.priceAr).toBeGreaterThan(0);
  });

  it('dos carré collé retourne épaisseur tranche', () => {
    const d = getBindingDetail(BINDING_LABELS.DCC, 48, '80');
    expect(d.compatible).toBe(true);
    expect(d.spineMm).toMatch(/mm/);
  });

  it('parse volets menu en pages', () => {
    expect(parsePagesFromConfig({ volets: '2 volets (pli simple)' })).toBe(4);
    expect(parsePagesFromConfig({ volets: 'Livret 4–8 pages' })).toBe(8);
  });

  it('grammageToBand classe les grammages', () => {
    expect(grammageToBand('80g')).toBe('80');
    expect(grammageToBand('170g')).toBe('120');
    expect(grammageToBand('300g')).toBe('250');
  });

  it('getBindingDetailFromConfig bk-livres', () => {
    const d = getBindingDetailFromConfig(BINDING_LABELS.PIQURE, {
      pages: '48',
      grammage_int: '80g',
    });
    expect(d?.compatible).toBe(true);
    expect(d?.reference).toBeTruthy();
  });

  it('computePhysicalSheets 41p R/V = 21 feuilles', () => {
    expect(computePhysicalSheets(41, 'recto_verso')).toBe(21);
  });
});
