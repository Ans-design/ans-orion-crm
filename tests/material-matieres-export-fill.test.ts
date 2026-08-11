import { describe, expect, it } from 'vitest';
import { fillEmptyMaterialTariffs } from '@/lib/backoffice/material-tariff-fill';
import {
  conflictsWithFinishedArticles,
  normalizeMaterialConflictKey,
  shouldListAsMaterial,
} from '@/lib/backoffice/material-vs-article';
import { materialRowToTableExport, MATERIAL_TABLE_EXPORT_COLUMNS } from '@/lib/backoffice/material-excel-format';
import type { MaterialPriceUnifiedRow } from '@/components/backoffice-v2/pricing-custom/material-prices/types';

describe('fillEmptyMaterialTariffs', () => {
  it('ne touche pas aux prix déjà renseignés', () => {
    const [out] = fillEmptyMaterialTariffs([
      { label: 'PCB 300g', blankSellPrice: 200, basePrintPrice: 350 },
    ]);
    expect(out.blankSellPrice).toBe(200);
    expect(out.basePrintPrice).toBe(350);
  });

  it('complète depuis Catalogue 2026 Excel (PCB 300g = 1500 Ar imprimé)', () => {
    const [out] = fillEmptyMaterialTariffs([
      { label: 'PCB 300g', family: 'carte', blankSellPrice: null, basePrintPrice: null },
    ]);
    expect(out.basePrintPrice).toBe(1500);
    expect(out.blankSellPrice).toBeGreaterThan(0);
    expect(Number(out.blankSellPrice)).toBeLessThanOrEqual(Number(out.basePrintPrice));
  });

  it('ne invente pas de prix hors Excel', () => {
    const [out] = fillEmptyMaterialTariffs([
      { label: 'Support inconnu XYZ-999', family: 'divers', blankSellPrice: null, basePrintPrice: null },
    ]);
    expect(out.blankSellPrice == null || out.blankSellPrice === 0).toBe(true);
    expect(out.basePrintPrice == null || out.basePrintPrice === 0).toBe(true);
  });
});

describe('Matières vs Articles finis', () => {
  it('interdit flyer / CV en matières', () => {
    expect(shouldListAsMaterial({ label: 'Flyer A5' })).toBe(false);
    expect(shouldListAsMaterial({ label: 'Carte de visite' })).toBe(false);
  });

  it('autorise PCB / bâche', () => {
    expect(shouldListAsMaterial({ label: 'PCB 300g' })).toBe(true);
    expect(shouldListAsMaterial({ label: 'Bâche 510g' })).toBe(true);
  });

  it('interdit si déjà présent en Articles finis (même nom)', () => {
    const keys = new Set([normalizeMaterialConflictKey('Roll-up 85×200')]);
    expect(conflictsWithFinishedArticles('Roll-up 85×200', keys)).toBe(true);
    expect(shouldListAsMaterial({ label: 'Roll-up 85×200', finishedArticleKeys: keys })).toBe(false);
    expect(shouldListAsMaterial({ label: 'PCB 300g', finishedArticleKeys: keys })).toBe(true);
  });
});

describe('materialRowToTableExport', () => {
  it('exporte les colonnes Tarification + dispo', () => {
    const stub = {
      id: 'm1',
      name: 'PCB 300g',
      label: 'PCB 300g',
      family: 'carte',
      blankSellPrice: 100,
      basePrintPrice: 200,
      publicationStatus: 'published',
      stockAvailable: 12,
      rowKind: 'material',
      materialKey: 'PCB-300',
      grammage: '300g',
      thickness: null,
      format: null,
      unit: 'feuille',
      unitDisplay: 'feuille',
    } as unknown as MaterialPriceUnifiedRow;
    const row = materialRowToTableExport(stub);
    expect(Object.keys(row)).toEqual([...MATERIAL_TABLE_EXPORT_COLUMNS]);
    expect(row['Prix matière']).toBe(100);
    expect(row['Marge de gain']).toBe(100);
    expect(row['Prix imprimé']).toBe(200);
    expect(row.Disponibilité).toBe('Disponible');
    expect(row.Statut).toBe('publié');
  });
});
