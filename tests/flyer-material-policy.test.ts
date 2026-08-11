import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import { FLYER_MATIERES, FLYER_MAX_GRAMMAGE_G } from '@/lib/data/flyer-material-catalog';
import {
  applyFlyerMaterialRules,
  filterFlyerGrammageOptions,
  filterFlyerMatiereOptions,
  isFlyerGrammageTooHeavy,
  resolveFlyerGrammageOptions,
} from '@/lib/pos/flyer-material-policy';
import { shouldInjectPrintMaterialCatalog } from '@/lib/pos/print-material-policy';

describe('flyer-material-catalog', () => {
  it('n’inclut ni PVC opaque ni carton rigide', () => {
    expect(FLYER_MATIERES.some((m) => /pvc|carton rigide/i.test(m))).toBe(false);
  });

  it('PCB flyer plafonné à 300 g avec grammages légers', () => {
    const cfg = getProductConfig('fly-std');
    const section = cfg?.sections.find((s) => s.title.includes('Matière'));
    const filter = section?.fields.find((f) => f.key === 'grammage')?.optionsFilter;
    const pcb = filter?.optionsByValue?.PCB ?? [];
    expect(pcb).toContain('90g');
    expect(pcb).toContain('130g');
    expect(pcb).toContain('170g');
    expect(pcb).toContain('300g');
    expect(pcb).not.toContain('350g');
    expect(pcb).not.toContain('600g');
  });

  it('Glossy flyer — échelle photo distincte du PCB (120–300 g)', () => {
    const cfg = getProductConfig('fly-std');
    const section = cfg?.sections.find((s) => s.title.includes('Matière'));
    const filter = section?.fields.find((f) => f.key === 'grammage')?.optionsFilter;
    const pcb = filter?.optionsByValue?.PCB ?? [];
    const glossy = filter?.optionsByValue?.Glossy ?? [];
    expect(pcb).toContain('90g');
    expect(pcb).toContain('130g');
    expect(pcb).not.toContain('120g');
    expect(glossy).toContain('120g');
    expect(glossy).toContain('140g');
    expect(glossy).toContain('160g');
    expect(glossy).toContain('180g');
    expect(glossy).toContain('300g');
    expect(glossy).not.toContain('90g');
    expect(glossy).not.toContain('350g');
  });

  it('expose la section plis / volets', () => {
    const cfg = getProductConfig('fly-std');
    const volets = cfg?.sections.find((s) => s.title === 'Plis / volets')?.fields[0];
    expect(volets?.key).toBe('volets');
    expect(volets?.options).toContain('3 volets (2 plis)');
  });
});

describe('flyer-material-policy', () => {
  it('filtre matières interdites injectées', () => {
    const opts = filterFlyerMatiereOptions('fly-a6', [
      ...FLYER_MATIERES,
      'PVC opaque 1 mm',
      'Carton rigide',
      'Offset',
    ], 'flyers');
    expect(opts).not.toContain('PVC opaque 1 mm');
    expect(opts).not.toContain('Carton rigide');
    expect(opts).toContain('PCB');
  });

  it('rejette grammage > 300 g', () => {
    expect(isFlyerGrammageTooHeavy('350g')).toBe(true);
    expect(isFlyerGrammageTooHeavy('300g')).toBe(false);
    expect(isFlyerGrammageTooHeavy('170g')).toBe(false);
    const opts = filterFlyerGrammageOptions('fly-a5', ['170g', '300g', '350g', '600g'], 'flyers');
    expect(opts).toEqual(['170g', '300g']);
  });

  it('réinitialise matière/grammage interdits', () => {
    const next = applyFlyerMaterialRules('fly-a4', {
      matiere: 'PVC opaque 1 mm',
      grammage: '1 mm',
    }, 'flyers');
    expect(next.matiere).toBe('');
    expect(next.grammage).toBe('');

    const heavy = applyFlyerMaterialRules('fly-a4', { matiere: 'PCB', grammage: '600g' }, 'flyers');
    expect(heavy.grammage).toBe('');
  });

  it('flyers n’injectent plus le catalogue fusion imprimerie', () => {
    expect(shouldInjectPrintMaterialCatalog('fly-std', 'flyers')).toBe(false);
  });

  it('max grammage constante 300 g', () => {
    expect(FLYER_MAX_GRAMMAGE_G).toBe(300);
  });

  it('resolveFlyerGrammageOptions ignore le catalogue stock épais', () => {
    const field = getProductConfig('fly-std')?.sections
      .flatMap((s) => s.fields)
      .find((f) => f.key === 'grammage');
    expect(field).toBeDefined();
    const opts = resolveFlyerGrammageOptions(
      field!,
      { matiere: 'PCB' },
      'fly-std',
      'flyers',
    );
    expect(opts).toContain('90g');
    expect(opts).toContain('130g');
    expect(opts).not.toContain('120g');
    expect(opts).not.toContain('350g');
    expect(opts).not.toContain('600g');

    const glossyOpts = resolveFlyerGrammageOptions(
      field!,
      { matiere: 'Glossy' },
      'fly-std',
      'flyers',
    );
    expect(glossyOpts).toContain('120g');
    expect(glossyOpts).toContain('140g');
    expect(glossyOpts).not.toContain('90g');
  });
});
