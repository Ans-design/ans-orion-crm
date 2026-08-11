import { describe, expect, it } from 'vitest';
import {
  MATERIAL_COLUMN_PRESETS,
  MATERIAL_MASTER_COLUMN_GROUPS,
  MATERIAL_MASTER_COLUMN_ORDER,
  materialColumnsForPreset,
} from '@/lib/backoffice/material-table-columns';
import { deriveMaterialMasterExtensions, resolveStockAlertLevel } from '@/lib/backoffice/material-master-row';
import type { MaterialPriceUnifiedRow } from '@/components/backoffice-v2/pricing-custom/material-prices/types';

describe('material master table', () => {
  it('defines master columns including 2e caractéristique', () => {
    expect(MATERIAL_MASTER_COLUMN_ORDER.length).toBeGreaterThanOrEqual(27);
    expect(MATERIAL_MASTER_COLUMN_ORDER).toContain('charType2');
    expect(MATERIAL_MASTER_COLUMN_ORDER).toContain('charValue2');
    const cols = materialColumnsForPreset('master');
    expect(cols.length).toBe(MATERIAL_MASTER_COLUMN_ORDER.length);
    expect(cols[0]?.id).toBe('material');
    expect(cols[cols.length - 1]?.id).toBe('actions');
  });

  it('groups cover all master columns without overlap', () => {
    const grouped = MATERIAL_MASTER_COLUMN_GROUPS.flatMap((g) => g.columnIds);
    expect(grouped).toHaveLength(MATERIAL_MASTER_COLUMN_ORDER.length);
    expect(new Set(grouped).size).toBe(MATERIAL_MASTER_COLUMN_ORDER.length);
    expect(grouped.sort()).toEqual([...MATERIAL_MASTER_COLUMN_ORDER].sort());
  });

  it('sticky columns on master preset', () => {
    const cols = materialColumnsForPreset('master');
    expect(cols.find((c) => c.id === 'material')?.stickyLeft).toBe(true);
    expect(cols.find((c) => c.id === 'actions')?.stickyRight).toBe(true);
  });

  it('master default hides secondary purchase/stock columns (no horizontal scroll)', () => {
    const hidden = new Set(MATERIAL_COLUMN_PRESETS.master.hiddenIds);
    for (const id of [
      'lastPurchasePrice',
      'lastPurchaseDate',
      'contextPrices',
      'stockPhysical',
      'stockReserved',
      'alerts',
    ]) {
      expect(hidden.has(id)).toBe(true);
    }
    const visible = materialColumnsForPreset('master').filter((c) => !hidden.has(c.id));
    const ids = visible.map((c) => c.id);
    for (const id of ['material', 'family', 'charValue', 'blank', 'price', 'stock', 'actions']) {
      expect(ids, id).toContain(id);
    }
    expect(ids).not.toContain('lastPurchasePrice');
    expect(ids).not.toContain('stockPhysical');
  });

  it('derives stock disponible from physical − reserved', () => {
    const row = {
      id: 'm1',
      name: 'Test',
      stockPhysical: 100,
      stockReserved: 30,
      stockAvailable: null,
    } as MaterialPriceUnifiedRow;
    const ext = deriveMaterialMasterExtensions(row);
    expect(ext.stockDisponible).toBe(70);
  });

  it('stock alert levels follow threshold rules', () => {
    expect(resolveStockAlertLevel(50, 10)).toBe('ok');
    expect(resolveStockAlertLevel(12, 10)).toBe('warn');
    expect(resolveStockAlertLevel(8, 10)).toBe('critical');
    expect(resolveStockAlertLevel(-1, 10)).toBe('negative');
    expect(resolveStockAlertLevel(null, 10)).toBe('missing');
  });
});
