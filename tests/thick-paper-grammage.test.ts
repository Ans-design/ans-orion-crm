import { describe, expect, it } from 'vitest';
import {
  filterThickPaperGrammageOptions,
  getMinGrammageG,
  isGrammageBelowMinimum,
} from '@/lib/pos/thick-paper-grammage-policy';
import { filterCalendarGrammageOptions } from '@/lib/calendar/calendar-material-policy';

describe('thick-paper-grammage-policy', () => {
  it('carte visite — minimum 230g', () => {
    expect(getMinGrammageG('cv-std', 'grammage')).toBe(230);
    expect(isGrammageBelowMinimum('cv-std', '135g', 'grammage')).toBe(true);
    expect(isGrammageBelowMinimum('cv-std', '250g', 'grammage')).toBe(false);
  });

  it('carte fidélité — minimum 250g', () => {
    expect(getMinGrammageG('cv-fidelite', 'grammage')).toBe(250);
    expect(isGrammageBelowMinimum('cv-fidelite', '230g', 'grammage')).toBe(true);
    expect(isGrammageBelowMinimum('cv-fidelite', '250g', 'grammage')).toBe(false);
  });

  it('calendrier chevalet — minimum 230g sur grammage principal', () => {
    expect(getMinGrammageG('cal-chevalet', 'grammage')).toBe(230);
    const filtered = filterThickPaperGrammageOptions(
      'cal-chevalet',
      ['90g', '135g', '250g', '300g', 'Grammage personnalisé'],
      'grammage',
    );
    expect(filtered).toEqual(['250g', '300g', 'Grammage personnalisé']);
  });

  it('calendrier plateau — minimum 300g via politique calendrier', () => {
    expect(getMinGrammageG('cal-plateau', 'grammage')).toBeNull();
    const filtered = filterCalendarGrammageOptions(
      'cal-plateau',
      ['250g', '300g', '350g', 'Grammage personnalisé'],
      'grammage',
    );
    expect(filtered).toEqual(['300g', '350g', 'Grammage personnalisé']);
  });

  it('livre intérieur — pas de minimum 230g', () => {
    expect(getMinGrammageG('bk-livres', 'grammage_interieur')).toBeNull();
    expect(isGrammageBelowMinimum('bk-livres', '80g', 'grammage_interieur')).toBe(false);
  });

  it('couverture livre / bloc-note — minimum 230g', () => {
    expect(getMinGrammageG('bn-bloc-note', 'grammage_couverture')).toBe(230);
    expect(getMinGrammageG('bk-livres', 'grammage_couverture')).toBe(230);
  });

  it('PVC mm — ignoré par la règle grammage', () => {
    expect(isGrammageBelowMinimum('cv-std', '1 mm', 'grammage')).toBe(false);
  });
});
