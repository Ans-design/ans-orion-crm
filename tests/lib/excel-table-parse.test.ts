import { describe, expect, it } from 'vitest';
import { validateMaterialExcelRows } from '@/lib/admin/excel-table';
import { normalizeExcelMaterialRow } from '@/lib/server/modules/materials/materials-excel-import.service';

describe('validateMaterialExcelRows', () => {
  it('rejette un fichier sans colonne matière', () => {
    const result = validateMaterialExcelRows([{ foo: 'bar', Prix: 100 }]);
    expect(result.ok).toBe(false);
  });

  it('accepte les en-têtes export ANS ORION', () => {
    const result = validateMaterialExcelRows([
      normalizeExcelMaterialRow({
        Matière: 'Test',
        'Prix base': 100,
        ID: 'abc',
      }) as unknown as Record<string, unknown>,
    ]);
    expect(result.ok).toBe(true);
  });
});
