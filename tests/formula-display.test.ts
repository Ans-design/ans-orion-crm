import { describe, expect, it } from 'vitest';
import {
  displayProfileLabel,
  filterFormulaProfiles,
  resolveProfileListState,
  stageForBlockKind,
} from '@/lib/pricing/formula-display';

describe('formula-display (Formules & règles UX)', () => {
  it('strips technical archive prefixes from labels', () => {
    expect(displayProfileLabel('[archivé→cv-std] Carte de visite')).toBe('Carte de visite');
    expect(displayProfileLabel('#draft Flyer A5')).toBe('Flyer A5');
  });

  it('hides archived profiles by default', () => {
    const rows = [
      {
        articleId: 'a',
        articleLabel: 'Actif',
        family: 'Carterie',
        status: 'published',
        formulaVersions: [{ version: 1, status: 'published' }],
      },
      {
        articleId: 'b',
        articleLabel: 'Vieux',
        family: 'Carterie',
        status: 'archived',
        formulaVersions: [{ version: 1, status: 'archived' }],
      },
    ];
    const filtered = filterFormulaProfiles(rows, {
      query: '',
      statusFilter: 'all',
      family: 'all',
    });
    expect(filtered.map((p) => p.articleId)).toEqual(['a']);
  });

  it('resolves readable list state without english status', () => {
    const state = resolveProfileListState({
      articleId: 'x',
      articleLabel: 'Flyer',
      family: 'Flyers',
      status: 'draft',
      formulaVersions: [{ version: 2, status: 'draft' }],
    });
    expect(state.primary).toBe('Brouillon');
    expect(state.detail).toContain('v2');
  });

  it('maps blocks to canvas stages', () => {
    expect(stageForBlockKind('minimum')).toBe('minimum');
    expect(stageForBlockKind('material_cost')).toBe('materials');
    expect(stageForBlockKind('round_ar')).toBe('round');
  });
});
