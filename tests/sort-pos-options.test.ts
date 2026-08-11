import { describe, expect, it } from 'vitest';
import {
  sortPOSOptions,
  sortGrammages,
  sortMatiereChipOptions,
} from '@/lib/pos/sort-pos-options';
import { resolveChipOptions } from '@/lib/pos/admin-chip-filter';
import type { ChipAdminEntry } from '@/lib/admin-config/types';

describe('sortPOSOptions — ordre métier global', () => {
  it('Test 1 — formats A6→A2, perso en fin', () => {
    expect(
      sortPOSOptions('format', ['A3+', 'A6', 'A2', 'A4', 'A5', 'A3', 'Format personnalisé']),
    ).toEqual(['A6', 'A5', 'A4', 'A3', 'A3+', 'A2', 'Format personnalisé']);
  });

  it('Test 2 — grammages numériques (pas alpha)', () => {
    expect(sortGrammages(['300g', '90g', '100g', '115g', '250g', '135g'])).toEqual([
      '90g',
      '100g',
      '115g',
      '135g',
      '250g',
      '300g',
    ]);
    expect(sortPOSOptions('grammage', ['300 G', '90 G', '100 G'])).toEqual([
      '90 G',
      '100 G',
      '300 G',
    ]);
  });

  it('Test 3 — matières Offset → PCM → PCB → photo → Dos bleu → perso', () => {
    expect(
      sortMatiereChipOptions([
        'PCB',
        'PCM',
        'Papier photo',
        'Dos bleu',
        'Offset',
        'Matière personnalisée',
      ]),
    ).toEqual([
      'Offset',
      'PCM',
      'PCB',
      'Papier photo',
      'Dos bleu',
      'Matière personnalisée',
    ]);
    expect(
      sortPOSOptions('matiere', ['PCB', 'Offset', 'PCM', 'Photo Glossy', 'Matière personnalisée']),
    ).toEqual(['Offset', 'PCM', 'PCB', 'Photo Glossy', 'Matière personnalisée']);
  });

  it('Test 4 — Admin order respecte l’ordre Excel', () => {
    const chips: Record<string, ChipAdminEntry> = {
      a: {
        id: 'a',
        scope: 'article',
        productId: 'imp-impression',
        blockKey: 'Matière',
        fieldKey: 'matiere',
        optionKey: 'pcb',
        label: 'PCB',
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
        source: 'admin',
      },
      b: {
        id: 'b',
        scope: 'article',
        productId: 'imp-impression',
        blockKey: 'Matière',
        fieldKey: 'matiere',
        optionKey: 'offset',
        label: 'Offset',
        order: 20,
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
        source: 'admin',
      },
    };
    const out = resolveChipOptions('matiere', ['Offset', 'PCB'], chips);
    expect(out.map((o) => o.label)).toEqual(['PCB', 'Offset']);
  });

  it('sans Admin order — fallback métier', () => {
    const out = resolveChipOptions('matiere', ['PCB', 'Offset', 'PCM'], {});
    expect(out.map((o) => o.label)).toEqual(['Offset', 'PCM', 'PCB']);
  });
});
