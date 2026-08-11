import { describe, expect, it } from 'vitest';
import {
  buildImpressionSfMigrationRows,
  IMPRESSION_SF_MIGRATION_GROUPS,
} from '@/lib/server/modules/pricing/impression-sf-base-printing-migration.service';
import {
  computeImpressionSfPrice,
  resolveBasePrintingMaterialKeys,
} from '@/lib/pricing/impression-sf-pricing';

describe('impression-sf-base-printing-migration', () => {
  it('génère des lignes nb80 Offset 80g pour tous les formats standards', () => {
    const rows = buildImpressionSfMigrationRows('nb80', 100);
    expect(rows.length).toBeGreaterThan(10);

    const a4Recto = rows.find((r) => r.formatLabel === 'A4' && r.face === 'recto');
    expect(a4Recto).toBeDefined();
    expect(a4Recto?.materialKey).toBe('Standard / Offset · N&B');
    expect(a4Recto?.grammage).toBe('80g');

    const legacy = computeImpressionSfPrice(
      {
        matiere: 'Standard / Offset',
        grammage: '80g',
        type: 'Impression numérique N&B',
        format: 'A4',
        face: 'Recto',
      },
      100,
    );
    expect(a4Recto?.basePrice).toBe(legacy.prixUnitaire);
  });

  it('génère q80la Couleur sans collision avec nb80', () => {
    const nb = buildImpressionSfMigrationRows('nb80', 100);
    const q = buildImpressionSfMigrationRows('q80la', 100);
    const nbA4 = nb.find((r) => r.formatLabel === 'A4' && r.face === 'recto');
    const qA4 = q.find((r) => r.formatLabel === 'A4' && r.face === 'recto');
    expect(nbA4?.materialKey).toBe('Standard / Offset · N&B');
    expect(qA4?.materialKey).toBe('Standard / Offset · Couleur');
    expect(qA4?.basePrice).toBeGreaterThan(nbA4?.basePrice ?? 0);
  });

  it('génère PCB 90g et PCM 90g', () => {
    const rows = buildImpressionSfMigrationRows('pcb90', 100);
    expect(rows.some((r) => r.materialKey === 'PCB' && r.grammage === '90g')).toBe(true);
    expect(rows.some((r) => r.materialKey === 'PCM' && r.grammage === '90g')).toBe(true);
    expect(rows.some((r) => r.materialKey === 'Glossy')).toBe(true);
  });

  it('inclut recto et recto-verso avec prix RV', () => {
    const rows = buildImpressionSfMigrationRows('nb80', 1);
    const a4Rv = rows.find((r) => r.formatLabel === 'A4' && r.face === 'recto_verso');
    const a4R = rows.find((r) => r.formatLabel === 'A4' && r.face === 'recto');
    expect(a4Rv?.basePrice).toBeGreaterThan(a4R?.basePrice ?? 0);
  });

  it('expose 3 groupes migration + offset80', () => {
    expect(IMPRESSION_SF_MIGRATION_GROUPS).toHaveLength(3);
    expect(IMPRESSION_SF_MIGRATION_GROUPS[0].pilots).toContain('nb80');
    expect(IMPRESSION_SF_MIGRATION_GROUPS[0].pilots).toContain('q80la');
  });
});

describe('resolveBasePrintingMaterialKeys', () => {
  it('discrimine N&B et Couleur sur Offset', () => {
    expect(
      resolveBasePrintingMaterialKeys({
        matiere: 'Standard / Offset',
        type: 'Impression numérique N&B',
      }),
    ).toContain('Standard / Offset · N&B');
    expect(
      resolveBasePrintingMaterialKeys({
        matiere: 'Standard / Offset',
        type: 'Impression numérique couleur',
      }),
    ).toContain('Standard / Offset · Couleur');
  });
});
