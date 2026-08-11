import { describe, it, expect } from 'vitest';
import {
  applyChipSelection,
  clearHiddenFieldValues,
  clearMaterialDependents,
  formatMultiSelectionProgress,
  getSelectionMode,
} from '@/lib/pos/chip-selection';
import type { ConfigField, ProductConfig } from '@/lib/data/config-types';
import { computePosCompletion, isFieldValueComplete } from '@/lib/pos/initial-config';

const faceField: ConfigField = {
  key: 'face',
  label: 'Face',
  type: 'chips',
  options: ['Recto', 'Recto-verso'],
  selectionMode: 'single',
};

const finitionsField: ConfigField = {
  key: 'finitions',
  label: 'Finitions',
  type: 'chips_multi',
  options: ['Pelliculage', 'Dorure', 'Rainage'],
  selectionMode: 'multiple',
};

const coinsArrondisConfig: ProductConfig = {
  sections: [
    {
      title: 'Coins',
      icon: '⬜',
      fields: [
        { key: 'coins', label: 'Coins', type: 'chips', options: ['Coins droits', 'Coins arrondis'] },
        {
          key: 'coins_arrondir',
          label: 'Coins à arrondir',
          type: 'chips_multi',
          options: ['Haut gauche', 'Haut droit', 'Bas gauche', 'Bas droit'],
          selectionMode: 'multipleMinMax',
          minSelections: 1,
          maxSelections: 4,
          showWhen: { field: 'coins', values: ['Coins arrondis'] },
        },
      ],
    },
  ],
};

describe('chip-selection', () => {
  it('infers single mode for chips', () => {
    expect(getSelectionMode(faceField)).toBe('single');
  });

  it('Test 2 — single select then deselect', () => {
    let cfg = applyChipSelection({}, faceField, 'Recto', null);
    expect(cfg.face).toBe('Recto');
    cfg = applyChipSelection(cfg, faceField, 'Recto', null);
    expect(cfg.face).toBe('');
  });

  it('Test 3 — single switch option', () => {
    let cfg = applyChipSelection({}, faceField, 'Recto', null);
    cfg = applyChipSelection(cfg, faceField, 'Recto-verso', null);
    expect(cfg.face).toBe('Recto-verso');
  });

  it('Test 4 — multiple toggle', () => {
    let cfg = applyChipSelection({}, finitionsField, 'Pelliculage', null);
    cfg = applyChipSelection(cfg, finitionsField, 'Dorure', null);
    expect(cfg.finitions).toEqual(['Pelliculage', 'Dorure']);
    cfg = applyChipSelection(cfg, finitionsField, 'Pelliculage', null);
    expect(cfg.finitions).toEqual(['Dorure']);
  });

  it('Test 7/8 — matière deselect clears grammage', () => {
    let cfg: Record<string, unknown> = { matiere: 'PCB', grammage: '250g' };
    cfg = applyChipSelection(cfg, { key: 'matiere', label: 'Matière', type: 'chips' }, 'PCB', null);
    expect(cfg.matiere).toBe('');
    cfg = clearMaterialDependents(cfg, 'matiere');
    expect(cfg.grammage).toBe('');
  });

  it('Test 9 — coins arrondis conditional cleanup', () => {
    let cfg = applyChipSelection({}, coinsArrondisConfig.sections[0].fields[0], 'Coins arrondis', coinsArrondisConfig);
    cfg = applyChipSelection(
      cfg,
      coinsArrondisConfig.sections[0].fields[1],
      'Haut gauche',
      coinsArrondisConfig,
    );
    expect(cfg.coins_arrondir).toEqual(['Haut gauche']);
    cfg = applyChipSelection(cfg, coinsArrondisConfig.sections[0].fields[0], 'Coins arrondis', coinsArrondisConfig);
    cfg = clearHiddenFieldValues(cfg, coinsArrondisConfig);
    expect(cfg.coins).toBe('');
    expect(cfg.coins_arrondir).toEqual([]);
  });

  it('multipleExact blocks over-selection', () => {
    const field: ConfigField = {
      key: 'coins_pick',
      label: 'Coins',
      type: 'chips_multi',
      selectionMode: 'multipleExact',
      exactSelections: 2,
      options: ['A', 'B', 'C', 'D'],
    };
    let cfg = applyChipSelection({}, field, 'A', null);
    cfg = applyChipSelection(cfg, field, 'B', null);
    expect(cfg.coins_pick).toEqual(['A', 'B']);
    const blocked = applyChipSelection(cfg, field, 'C', null);
    expect(blocked.coins_pick).toEqual(['A', 'B']);
  });

  it('progression decreases on deselect', () => {
    const product: ProductConfig = {
      sections: [{ title: 'Face', icon: '🖨️', fields: [faceField] }],
    };
    let cfg = applyChipSelection({}, faceField, 'Recto', product);
    expect(computePosCompletion(product, cfg).done).toBe(1);
    cfg = applyChipSelection(cfg, faceField, 'Recto', product);
    expect(computePosCompletion(product, cfg).done).toBe(0);
    expect(isFieldValueComplete(faceField, cfg.face)).toBe(false);
  });

  it('formatMultiSelectionProgress — compteur exact', () => {
    const field: ConfigField = {
      key: 'coins_pick',
      label: 'Coins',
      type: 'chips_multi',
      selectionMode: 'multipleExact',
      exactSelections: 2,
      options: ['A', 'B', 'C'],
    };
    expect(formatMultiSelectionProgress(field, [])).toBe('0/2 sélectionnés');
    expect(formatMultiSelectionProgress(field, ['A'])).toBe('1/2 sélectionnés');
    expect(formatMultiSelectionProgress(field, ['A', 'B'])).toBe('2/2 sélectionnés');
  });
});
