import { describe, it, expect } from 'vitest';
import {
  parseLegacyPaper,
  isCombinedPaperOption,
  buildPaperSplitFromOptions,
  isPaperWeightCompatible,
  validatePaperConfigStrict,
  normalizePaperInConfig,
} from '@/lib/data/paper-material';
import { migrateProductConfigPaper } from '@/lib/data/config-paper-migrate';
import { getProductConfig } from '@/lib/data/config-types';

describe('paper-material', () => {
  it('parse legacy combined chips', () => {
    expect(parseLegacyPaper('Offset 80g')).toEqual({ paperType: 'Offset', paperWeight: '80g' });
    expect(parseLegacyPaper('PCB135g')).toEqual({ paperType: 'PCB', paperWeight: '135g' });
    expect(parseLegacyPaper('PCM 170g')).toEqual({ paperType: 'PCM', paperWeight: '170g' });
    expect(parseLegacyPaper('Bristol 250g')).toEqual({ paperType: 'Bristol', paperWeight: '250g' });
  });

  it('detects combined options', () => {
    expect(isCombinedPaperOption('PCM170g')).toBe(true);
    expect(isCombinedPaperOption('PCM')).toBe(false);
    expect(isCombinedPaperOption('Matière personnalisée')).toBe(false);
  });

  it('builds split from flyer options', () => {
    const split = buildPaperSplitFromOptions(
      ['PCB 135g', 'PCB 170g', 'PCM 135g', 'PCM 170g', 'Offset 80g', 'Offset 100g', 'Bristol 250g', 'Matière personnalisée'],
      'PCB 135g',
    );
    expect(split.types).toContain('Offset');
    expect(split.types).toContain('PCB');
    expect(split.weightsByType.Offset).toEqual(['80g', '100g']);
    expect(split.weightsByType.PCB).toContain('135g');
    expect(split.defaultType).toBe('PCB');
    expect(split.defaultWeight).toBe('135g');
  });

  it('validates compatibility', () => {
    expect(isPaperWeightCompatible('Offset', '80g')).toBe(true);
    expect(isPaperWeightCompatible('Offset', '170g')).toBe(false);
    expect(isPaperWeightCompatible('PCM', '250g')).toBe(true);
  });

  it('rejects legacy combined config on server', () => {
    expect(validatePaperConfigStrict({ matiere: 'PCM 170g' }).ok).toBe(false);
    expect(validatePaperConfigStrict({ paperType: 'PCM', paperWeight: '250g' }).ok).toBe(true);
  });

  it('normalizes legacy matiere to paperType/paperWeight', () => {
    const { config } = normalizePaperInConfig({ matiere: 'Offset 80g' });
    expect(config.paperType).toBe('Offset');
    expect(config.paperWeight).toBe('80g');
    expect(config.matiere).toBeUndefined();
  });

  it('conserve matiere+grammage carterie (POS simulate)', () => {
    const posConfig = {
      format: '85×55 mm',
      matiere: 'PVC opaque 1 mm',
      grammage: '1 mm',
      face: 'Recto',
      qty: 500,
    };
    const { config } = normalizePaperInConfig(posConfig);
    expect(config.matiere).toBe('PVC opaque 1 mm');
    expect(config.grammage).toBe('1 mm');
    expect(validatePaperConfigStrict(config).ok).toBe(true);
  });

  it('conserve PCB + grammage séparés', () => {
    const { config } = normalizePaperInConfig({
      matiere: 'PCB',
      grammage: '350g',
      face: 'Recto',
    });
    expect(config.matiere).toBe('PCB');
    expect(config.grammage).toBe('350g');
  });
});

describe('config-paper-migrate', () => {
  it('flyer config has separated matiere and grammage in source', () => {
    const cfg = getProductConfig('fly-std', 'flyer');
    expect(cfg).not.toBeNull();
    const typeSection = cfg!.sections.find((s) => s.title.includes('Matière & grammage') || s.title.includes('Matière'));
    expect(typeSection).toBeDefined();
    const matField = typeSection!.fields.find((f) => f.key === 'matiere' || f.key === 'paperType');
    expect(matField).toBeDefined();
    expect(matField!.options).toContain('PCB');
    expect(matField!.options).toContain('Offset');
    expect(matField!.options?.some((o) => /\d+g/i.test(o))).toBe(false);

    const gramField = typeSection!.fields.find((f) => f.key === 'grammage' || f.key === 'paperWeight');
    expect(gramField).toBeDefined();
    expect(gramField!.optionsFilter || gramField?.key === 'paperWeight').toBeTruthy();
    expect(gramField!.options ?? []).toEqual([]);
  });
});
