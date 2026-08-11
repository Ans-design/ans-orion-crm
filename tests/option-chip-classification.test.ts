import { describe, expect, it } from 'vitest';
import {
  classifyOptionChip,
  classifyOptionChips,
} from '@/lib/server/modules/backoffice-v2/option-chip-classification';

describe('classifyOptionChip', () => {
  it('classe formats vers matières/formats', () => {
    const r = classifyOptionChip({
      id: '1',
      label: '85×55 mm',
      blockKey: 'Dimensions',
      articleId: 'carte-visite',
    });
    expect(r.bucket).toBe('matieres_formats');
  });

  it('classe coins vers finitions', () => {
    const r = classifyOptionChip({
      id: '2',
      label: 'Coin arrondi',
      blockKey: 'Coins',
      impactsProduction: true,
    });
    expect(r.bucket).toBe('finitions');
  });

  it('classe impact prix vers formules', () => {
    const r = classifyOptionChip({
      id: '3',
      label: 'Supplément urgent',
      blockKey: 'Particularités',
      impactsPrice: true,
      priceModifier: 5000,
      articleId: 'flyer',
    });
    expect(r.bucket).toBe('formules_prix');
  });

  it('classe archivés en historique', () => {
    const r = classifyOptionChip({
      id: '4',
      label: 'Ancien format',
      blockKey: 'Format',
      archived: true,
    });
    expect(r.bucket).toBe('historique_technique');
  });

  it('agrège les compteurs', () => {
    const { counts, total } = classifyOptionChips([
      { id: 'a', label: '90×50 mm', blockKey: 'Format' },
      { id: 'b', label: 'Bord carré', blockKey: 'Coins' },
      { id: 'c', label: 'Note interne', blockKey: 'Notes', isInformational: true },
    ]);
    expect(total).toBe(3);
    expect(counts.matieres_formats).toBe(1);
    expect(counts.finitions).toBe(1);
    expect(counts.dependances).toBe(1);
  });
});
