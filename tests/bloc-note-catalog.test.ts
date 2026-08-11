import { describe, expect, it } from 'vitest';
import { POS_CATALOGUE, findCatalogueItem } from '@/lib/data/catalogue-meta';
import {
  BLOC_NOTE_CANONICAL_ID,
  blocNoteLegacyPrefill,
  resolveBlocNoteCanonicalId,
} from '@/lib/pos/bloc-note-catalog';

describe('bloc-note catalogue fusion', () => {
  it('exposes a single bloc-note entry in POS catalogue', () => {
    const notes = POS_CATALOGUE.filter((a) => a.category === 'notes');
    expect(notes).toHaveLength(1);
    expect(notes[0]?.id).toBe(BLOC_NOTE_CANONICAL_ID);
    expect(notes[0]?.name).toMatch(/Bloc-note/i);
  });

  it('resolves legacy IDs to canonical article', () => {
    expect(resolveBlocNoteCanonicalId('bn-a5')).toBe(BLOC_NOTE_CANONICAL_ID);
    expect(findCatalogueItem('bn-a4')?.id).toBe(BLOC_NOTE_CANONICAL_ID);
  });

  it('prefills format from legacy URL ids', () => {
    expect(blocNoteLegacyPrefill('bn-a6')).toEqual({ format: 'A6', produit: 'Bloc-note' });
    expect(blocNoteLegacyPrefill('bn-agenda')).toEqual({ format: 'A5', produit: 'Agenda' });
    expect(blocNoteLegacyPrefill('fly-std')).toBeNull();
  });
});
