import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import {
  IMPRESSION_SF_MATERIALS,
  IMPRESSION_SF_MATIERE_LABELS,
  IMPRESSION_SF_WEIGHTS_BY_MATIERE,
} from '@/lib/data/impression-sf-material-catalog';
import {
  impressionSfLegacyPrefill,
  impressionSfLegacyRedirectTarget,
  resolveImpressionSfCanonicalId,
} from '@/lib/pos/impression-sf-catalog';
import {
  applyImpressionSfMaterialRules,
  filterImpressionSfFormatOptions,
  filterImpressionSfMatiereOptions,
  resolveImpressionSfGrammageOptions,
} from '@/lib/pos/impression-sf-policy';
import type { ConfigField } from '@/lib/data/config-types';

describe('impression-sf-material-catalog', () => {
  it('expose PCB, PCM et Glossy comme entrées distinctes au même niveau', () => {
    const labels = IMPRESSION_SF_MATIERE_LABELS;
    expect(labels).toContain('PCB');
    expect(labels).toContain('PCM');
    expect(labels).toContain('Glossy');
    const pcbIdx = labels.indexOf('PCB');
    const pcmIdx = labels.indexOf('PCM');
    const glossyIdx = labels.indexOf('Glossy');
    expect(pcbIdx).toBeLessThan(pcmIdx);
    expect(pcmIdx).toBeLessThan(glossyIdx);
    expect(labels.filter((l) => l === 'Glossy').length).toBe(1);
  });

  it('attribue des grammages distincts par matière', () => {
    expect(IMPRESSION_SF_WEIGHTS_BY_MATIERE.PCB).toContain('90g');
    expect(IMPRESSION_SF_WEIGHTS_BY_MATIERE.PCM).toContain('90g');
    expect(IMPRESSION_SF_WEIGHTS_BY_MATIERE.Glossy).toContain('120g');
    expect(IMPRESSION_SF_WEIGHTS_BY_MATIERE.Glossy).not.toContain('90g');
  });

  it('inclut toutes les matières petit format sans finition', () => {
    const ids = IMPRESSION_SF_MATERIALS.map((m) => m.id);
    expect(ids).toEqual(expect.arrayContaining([
      'standard', 'journal', 'pcb', 'pcm', 'glossy', 'bristol', 'texture', 'toile_fin',
      'invitation', 'contre_colle', 'autocollant', 'collant_glossy', 'adestor', 'satine_mat', 'mat',
      'pellicule', 'pvc_transl', 'pvc_opaque', 'sublimation',
    ]));
  });

  it('inclut papier journal et nouvelles matières métier', () => {
    expect(IMPRESSION_SF_MATIERE_LABELS).toContain('Papier journal');
    expect(IMPRESSION_SF_MATIERE_LABELS).toContain('Papier collant glossy');
    expect(IMPRESSION_SF_MATIERE_LABELS).toContain('Papier adhestor');
    expect(IMPRESSION_SF_MATIERE_LABELS).not.toContain('Papier photo');
    expect(IMPRESSION_SF_WEIGHTS_BY_MATIERE['Standard / Offset']).toEqual(
      expect.arrayContaining(['70g', '80g', '90g']),
    );
    expect(IMPRESSION_SF_WEIGHTS_BY_MATIERE['Standard / Offset']).not.toContain('100g');
    expect(IMPRESSION_SF_WEIGHTS_BY_MATIERE.PCB).toContain('600g');
    expect(IMPRESSION_SF_WEIGHTS_BY_MATIERE.PCB).not.toContain('600g (300g×2)');
    expect(IMPRESSION_SF_MATIERE_LABELS).toContain('Papier satiné mat');
    expect(IMPRESSION_SF_MATIERE_LABELS).toContain('Papier mat');
  });
});

describe('IMP_IMPRESSION config', () => {
  const cfg = getProductConfig('imp-impression', 'impression');
  const matSection = cfg?.sections.find((s) => s.title === 'Matière & grammage');
  const matField = matSection?.fields.find((f) => f.key === 'matiere');
  const formatSection = cfg?.sections.find((s) => s.title === 'Format');
  const formatField = formatSection?.fields.find((f) => f.key === 'format');

  it('utilise le catalogue ISF unifié', () => {
    expect(matField?.options).toEqual(IMPRESSION_SF_MATIERE_LABELS);
    expect(formatField?.options).toContain('A6');
    expect(formatField?.options).toContain('A3+');
    expect(formatField?.options).not.toContain('SRA3');
    expect(formatField?.options).not.toContain('A0');
  });

  it('n\'utilise pas Offset comme libellé legacy', () => {
    expect(matField?.options).toContain('Standard / Offset');
    expect(matField?.default).toBe('Standard / Offset');
    expect(matField?.options).not.toContain('Offset');
  });

  it('place matière avant le type d\'impression', () => {
    const titles = cfg?.sections.map((s) => s.title) ?? [];
    const formatIdx = titles.indexOf('Format');
    const matIdx = titles.indexOf('Matière & grammage');
    const typeIdx = titles.indexOf('Type d\'impression');
    expect(formatIdx).toBeLessThan(matIdx);
    expect(matIdx).toBeLessThan(typeIdx);
  });
});

describe('impression-sf-policy', () => {
  const grammageField: ConfigField = {
    key: 'grammage',
    label: 'Grammage',
    type: 'chips',
    optionsFilter: { field: 'matiere', optionsByValue: IMPRESSION_SF_WEIGHTS_BY_MATIERE },
  };

  it('limite Bristol à A4 max', () => {
    const opts = ['A6', 'A5', 'A4', 'A3', 'A3+', 'Format personnalisé'];
    const filtered = filterImpressionSfFormatOptions('Bristol', opts);
    expect(filtered).toContain('A4');
    expect(filtered).not.toContain('A3');
    expect(filtered).not.toContain('A3+');
    expect(filtered).toContain('Format personnalisé');
  });

  it('autorise Glossy jusqu\'à A3', () => {
    const opts = ['A4', 'A3', 'A3+'];
    const filtered = filterImpressionSfFormatOptions('Glossy', opts);
    expect(filtered).toContain('A3');
    expect(filtered).not.toContain('A3+');
  });

  it('exclut PVC translucide pour format A3', () => {
    const mats = filterImpressionSfMatiereOptions('A3', [...IMPRESSION_SF_MATIERE_LABELS]);
    expect(mats).toContain('PCB');
    expect(mats).not.toContain('PVC translucide');
    expect(mats).not.toContain('Bristol');
  });

  it('résout les grammages PCB depuis le catalogue ISF', () => {
    const opts = resolveImpressionSfGrammageOptions(grammageField, { matiere: 'PCB' });
    expect(opts).toContain('300g');
    expect(opts).toContain('Grammage personnalisé');
  });

  it('réinitialise format incompatible quand matière change', () => {
    const next = applyImpressionSfMaterialRules('imp-impression', {
      matiere: 'Bristol',
      format: 'A3',
      grammage: '300g',
    }, 'impression');
    expect(next.format).toBe('A4');
  });
});

describe('impression-sf-catalog legacy', () => {
  it('redirige les anciens articles vers imp-impression', () => {
    expect(resolveImpressionSfCanonicalId('imp-pcb')).toBe('imp-impression');
    expect(impressionSfLegacyRedirectTarget('imp-offset')).toBe('imp-impression');
  });

  it('préremplit la matière pour les entrées legacy', () => {
    expect(impressionSfLegacyPrefill('imp-pcb')).toEqual({ matiere: 'PCB' });
    expect(impressionSfLegacyPrefill('imp-autocollant')).toEqual({ matiere: 'Papier autocollant' });
  });
});
