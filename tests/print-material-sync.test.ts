import { describe, expect, it } from 'vitest';
import { OFFICIAL_MATERIAL_COMPAT } from '@/lib/data/material-compat-official';
import {
  PRINT_PETIT_FORMAT_MATIERES,
  PRINT_WEIGHTS_BY_MATIERE,
} from '@/lib/data/print-material-weights';
import { resolveGrammageOptions } from '@/lib/pos/grammage-field';
import type { ConfigField } from '@/lib/data/config-types';

describe('print-material-weights', () => {
  it('dérive les grammages PCB depuis le catalogue officiel', () => {
    const official = OFFICIAL_MATERIAL_COMPAT.find((m) => m.label === 'PCB');
    expect(official?.grammages).toContain('600g');
    expect(PRINT_WEIGHTS_BY_MATIERE.PCB).toEqual(
      expect.arrayContaining(official!.grammages),
    );
  });

  it('inclut Glossy dans les matières print', () => {
    expect(PRINT_PETIT_FORMAT_MATIERES).toContain('Glossy');
  });
});

describe('resolveGrammageOptions', () => {
  const field: ConfigField = {
    key: 'grammage',
    label: 'Grammage',
    type: 'chips',
    options: [],
    optionsFilter: {
      field: 'matiere',
      optionsByValue: {
        PCB: ['135g', 'Grammage personnalisé'],
      },
    },
  };

  it('priorise le catalogue API sur optionsFilter statique', () => {
    const opts = resolveGrammageOptions(
      field,
      { matiere: 'PCB' },
      { PCB: ['170g', '250g', '300g', '350g', '600g', '700g', 'Grammage personnalisé'] },
    );
    expect(opts).toContain('600g');
    expect(opts).not.toContain('135g');
  });
});
