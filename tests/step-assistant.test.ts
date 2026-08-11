import { describe, expect, it } from 'vitest';
import {
  buildPosSteps,
  buildPosWizardStages,
  getPosNextStepField,
} from '@/lib/pos/step-assistant';
import type { ProductConfig } from '@/lib/data/config-types';

const SAMPLE = {
  sections: [
    {
      title: 'Main',
      icon: '📄',
      fields: [
        { key: 'format', label: 'Format', type: 'chips', options: ['A4', 'A3'] },
        { key: 'grammage', label: 'Grammage', type: 'chips', options: ['250g', '300g'] },
        { key: 'qty', label: 'Quantité', type: 'number', min: 1 },
      ],
    },
  ],
} as ProductConfig;

const BOITE_LIKE = {
  sections: [
    {
      title: 'Structure',
      icon: '📦',
      fields: [
        { key: 'structure', label: 'Type de boîte', type: 'chips', options: ['A', 'B'] },
      ],
    },
    {
      title: 'Dimensions intérieures (L × P × H)',
      icon: '📐',
      fields: [
        { key: 'longueur', label: 'Longueur L', type: 'number', min: 10 },
        { key: 'profondeur', label: 'Profondeur P', type: 'number', min: 10 },
        { key: 'hauteur', label: 'Hauteur H', type: 'number', min: 10 },
      ],
    },
    {
      title: 'Matière & grammage',
      icon: '📃',
      fields: [
        { key: 'matiere', label: 'Matière', type: 'chips', options: ['PCM', 'PCB'] },
        { key: 'grammage', label: 'Grammage', type: 'chips', options: ['300g', '350g'] },
      ],
    },
  ],
} as ProductConfig;

describe('step-assistant', () => {
  it('identifies next incomplete step', () => {
    const cfg = { format: 'A4', grammage: '', qty: '' };
    const next = getPosNextStepField(SAMPLE, cfg);
    expect(next?.key).toBe('grammage');
  });

  it('marks completed steps', () => {
    const cfg = { format: 'A4', grammage: '250g', qty: 100 };
    const steps = buildPosSteps(SAMPLE, cfg);
    expect(steps.every((s) => s.complete)).toBe(true);
    expect(steps.some((s) => s.isCurrent)).toBe(false);
  });

  it('groups matière + grammage and dimensions into wizard stages', () => {
    const stages = buildPosWizardStages(BOITE_LIKE, {});
    expect(stages.map((s) => s.label)).toEqual([
      'Type de boîte',
      'Dimensions intérieures',
      'Matière & grammage',
    ]);
    expect(stages[2]?.fieldKeys).toEqual(['matiere', 'grammage']);
    // L/P exclus du progress tracker mais inclus dans l’affichage étape
    expect(stages[1]?.fieldKeys).toEqual(['longueur', 'profondeur', 'hauteur']);
  });

  it('keeps intérieur / couverture as separate matière stages (livres)', () => {
    const livresLike = {
      sections: [
        {
          title: 'Type',
          icon: '📚',
          fields: [{ key: 'type', label: 'Type', type: 'chips', options: ['Booklet'] }],
        },
        {
          title: 'Intérieur — Matière & grammage',
          icon: '📃',
          fields: [
            { key: 'matiere_int', label: 'Matière', type: 'chips', options: ['Offset'] },
            { key: 'grammage_int', label: 'Grammage', type: 'chips', options: ['80g'] },
          ],
        },
        {
          title: 'Couverture — Matière & grammage',
          icon: '📃',
          fields: [
            { key: 'matiere_couv', label: 'Matière', type: 'chips', options: ['Couché'] },
            { key: 'grammage_couv', label: 'Grammage', type: 'chips', options: ['250g'] },
          ],
        },
      ],
    } as ProductConfig;
    const stages = buildPosWizardStages(livresLike, {});
    expect(stages.map((s) => s.label)).toEqual([
      'Type',
      'Intérieur — Matière & grammage',
      'Couverture — Matière & grammage',
    ]);
  });
});
