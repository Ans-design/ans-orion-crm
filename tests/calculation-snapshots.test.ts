import { describe, expect, it } from 'vitest';
import { buildPackagingCalculationSnapshot, PACKAGING_SNAPSHOT_VERSION } from '@/lib/packaging/packaging-snapshot';
import { buildCustomSurfaceSnapshotForArticle } from '@/lib/pos/surface-snapshot';
import { buildBindingCalculationSnapshot, BINDING_SNAPSHOT_VERSION } from '@/lib/print/binding-snapshot';
import { BINDING_LABELS } from '@/lib/data/binding-catalog';
import { summarizeConfigSnapshot } from '@/lib/commande/config-snapshot-lines';

describe('calculation snapshots', () => {
  it('fige snapshot packaging étiquette', () => {
    const snap = buildPackagingCalculationSnapshot(
      'pkg-etiquette',
      { format: 'Format personnalisé', longueur: 80, largeur: 40 },
      { unitPrice: 1200, qty: 100, prixCm2: 3 },
    );
    expect(snap?.formulaVersion).toBe(PACKAGING_SNAPSHOT_VERSION);
    expect(snap?.formatDeveloppe).toContain('80');
    expect(snap?.totalPrice).toBe(120_000);
  });

  it('fige snapshot surface L×l hors packaging', () => {
    const snap = buildCustomSurfaceSnapshotForArticle(
      'fly-a4',
      { format: 'Format personnalisé', longueur: 100, largeur: 50 },
      { unitPrice: 500, qty: 10 },
    );
    expect(snap?.realSurfaceM2).toBeGreaterThan(0);
    expect(snap?.totalGrossSurfaceM2).toBeGreaterThan(snap!.grossSurfaceM2);
  });

  it('fige snapshot reliure livre', () => {
    const snap = buildBindingCalculationSnapshot('bk-livres', {
      pages: '32',
      grammage_int: '80g',
      reliure: BINDING_LABELS.PIQURE,
    });
    expect(snap?.formulaVersion).toBe(BINDING_SNAPSHOT_VERSION);
    expect(snap?.physicalSheets).toBe(32);
    expect(snap?.referenceLabel).toBeTruthy();
  });

  it('résumé devis inclut packaging et reliure', () => {
    const summary = summarizeConfigSnapshot(
      'Étiquette',
      50,
      {
        _packagingSnapshot: buildPackagingCalculationSnapshot(
          'pkg-etiquette',
          { format: 'Format personnalisé', longueur: 60, largeur: 30 },
          { unitPrice: 100, qty: 50 },
        ),
        _bindingSnapshot: buildBindingCalculationSnapshot('bn-a5', {
          nombre_feuilles: '80',
          type_reliure: BINDING_LABELS.SPIRALE_PLASTIQUE,
          grammage: '80g',
          face: 'Recto-Verso',
        }),
      },
      'pkg-etiquette',
    );
    expect(summary.lines.some((l) => l.key === 'Développé')).toBe(true);
    expect(summary.lines.some((l) => l.key === 'Reliure')).toBe(true);
  });
});
