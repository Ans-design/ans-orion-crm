import { describe, it, expect } from 'vitest';
import {
  buildEmptyPosConfig,
  collectPosProgressFields,
  computePosCompletion,
  isFieldValueComplete,
  isPosConfigReady,
} from '@/lib/pos/initial-config';
import type { ProductConfig } from '@/lib/data/config-types';
import { getProductConfig } from '@/lib/data/config-types';

const SAMPLE: ProductConfig = {
  sections: [
    {
      title: 'Format',
      icon: '📐',
      fields: [
        { key: 'format', label: 'Format', type: 'chips', options: ['A5', 'A4'], default: 'A5' },
      ],
    },
    {
      title: 'Matière',
      icon: '📃',
      fields: [{ key: 'matiere', label: 'Matière', type: 'chips', options: ['PCB', 'PCM'], default: 'PCB' }],
    },
    {
      title: 'Grammage',
      icon: '⚖️',
      fields: [
        {
          key: 'grammage',
          label: 'Grammage',
          type: 'chips',
          options: ['135g', '170g'],
          default: '135g',
          showWhen: { field: 'matiere', values: ['PCB', 'PCM'] },
        },
      ],
    },
    {
      title: 'Quantité',
      icon: '📦',
      fields: [{ key: 'qty', label: 'Quantité', type: 'number', min: 25, default: 500 }],
    },
    {
      title: 'Notes',
      icon: '📝',
      fields: [{ key: 'remarques', label: 'Remarques', type: 'textarea' }],
    },
  ],
};

describe('pos initial-config', () => {
  it('buildEmptyPosConfig leaves chips and qty empty', () => {
    const cfg = buildEmptyPosConfig(SAMPLE);
    expect(cfg.format).toBe('');
    expect(cfg.matiere).toBe('');
    expect(cfg.grammage).toBe('');
    expect(cfg.qty).toBe('');
  });

  it('starts at 0/N progress', () => {
    const cfg = buildEmptyPosConfig(SAMPLE);
    const progress = computePosCompletion(SAMPLE, cfg);
    expect(progress).toEqual({ done: 0, total: 3, pct: 0 });
    expect(isPosConfigReady(SAMPLE, cfg)).toBe(false);
  });

  it('counts only visible required fields', () => {
    const cfg = { ...buildEmptyPosConfig(SAMPLE), matiere: 'PCB', format: 'A5', qty: 500 };
    const progress = computePosCompletion(SAMPLE, cfg);
    expect(progress.done).toBe(3);
    expect(progress.total).toBe(4);
    expect(isPosConfigReady(SAMPLE, cfg)).toBe(false);
  });

  it('is ready when all visible required fields are filled', () => {
    const cfg = {
      format: 'A5',
      matiere: 'PCB',
      grammage: '135g',
      qty: 500,
    };
    expect(isPosConfigReady(SAMPLE, cfg)).toBe(true);
  });

  it('carterie : finitions optionnelles avec « Sans » par défaut', () => {
    const cv = getProductConfig('cv-std', 'carterie');
    expect(cv).not.toBeNull();
    const empty = buildEmptyPosConfig(cv);
    expect(empty.pelliculage).toBe('Sans');
    expect(empty.gaufrage).toBe('Sans');
    expect(empty.decoupe).toBe('Sans');

    const cfg = {
      format: '85×55 mm',
      matiere: 'PCB',
      grammage: '300g',
      orientation: 'Paysage',
      face: 'Recto',
      coins: 'Bord carré',
      qty: 500,
      // finitions non renseignées explicitement
    };
    const progress = computePosCompletion(cv, cfg);
    expect(progress.total).toBeLessThan(
      cv!.sections.flatMap((s) => s.fields).filter((f) => f.type !== 'textarea').length,
    );
    expect(isPosConfigReady(cv, cfg)).toBe(true);
  });

  it('livres : ne seed pas pages_noir / pages_quadri hors Mixte', () => {
    const bk = getProductConfig('bk-livres', 'livre');
    expect(bk).not.toBeNull();
    const empty = buildEmptyPosConfig(bk);
    expect(empty).not.toHaveProperty('pages_noir');
    expect(empty).not.toHaveProperty('pages_quadri');
  });

  it('grand format ISO : Laize hors progression (panier possible sans laize)', () => {
    const gf = getProductConfig('gf-bache', 'grand_format');
    expect(gf).not.toBeNull();
    const iso = {
      type_bache: 'Bâche PVC standard',
      grammage: '440g',
      format: 'A4 — 210×297 mm',
      dos: 'Dos blanc',
      aspect: 'Mat',
      face: 'Recto seul',
      oeillets_data: { mode: 'Aucun', count: 0, positions: [] },
      qty: 1,
    };
    const fields = collectPosProgressFields(gf, iso);
    expect(fields.some((f) => f.key === 'laize' || f.key === 'laize_plaque')).toBe(false);
    const missingLaize = fields.filter((f) => !isFieldValueComplete(f, iso[f.key as keyof typeof iso], iso));
    expect(missingLaize.map((f) => f.key)).not.toContain('laize');
  });

  it('grand format personnalisé : Laize reste obligatoire', () => {
    const gf = getProductConfig('gf-bache', 'grand_format');
    expect(gf).not.toBeNull();
    const custom = {
      type_bache: 'Bâche PVC standard',
      grammage: '440g',
      format: 'Format personnalisé',
      largeur_cm: 200,
      longueur_cm: 100,
      dos: 'Dos blanc',
      aspect: 'Mat',
      face: 'Recto seul',
      oeillets_data: { mode: 'Aucun', count: 0, positions: [] },
      qty: 1,
    };
    const fields = collectPosProgressFields(gf, custom);
    expect(fields.some((f) => f.key === 'laize')).toBe(true);
  });
});
