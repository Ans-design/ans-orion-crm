import { describe, expect, it } from 'vitest';
import {
  countDuplicateExcelIdSkips,
  detectDuplicateExcelIds,
  formatDuplicateExcelIdGroup,
} from '@/lib/backoffice/material-excel-duplicate-ids';

describe('detectDuplicateExcelIds', () => {
  it('détecte un ID numérique partagé par plusieurs lignes avec détail matière', () => {
    const groups = detectDuplicateExcelIds([
      { Matière: 'aadd', ID: '001' },
      { Matière: 'fd', ID: '001' },
      { Matière: 'dezfergrt', ID: '001' },
      { Matière: 'unique', ID: '002' },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]!.excelId).toBe('001');
    expect(groups[0]!.entries).toHaveLength(3);
    expect(groups[0]!.hasConflictingMaterials).toBe(true);
    expect(groups[0]!.keptMaterial).toBe('aadd');

    const formatted = formatDuplicateExcelIdGroup(groups[0]!);
    expect(formatted).toContain('L2 « aadd »');
    expect(formatted).toContain('L3 « fd »');
    expect(formatted).toContain('L4 « dezfergrt »');
    expect(formatted).toContain('matières différentes');
  });

  it('compte les lignes ignorées (hors 1ère occurrence)', () => {
    const groups = detectDuplicateExcelIds([
      { Matière: 'A', ID: '5' },
      { Matière: 'B', ID: '5' },
      { Matière: 'C', ID: '5' },
      { Matière: 'D', ID: '5' },
      { Matière: 'E', ID: '5' },
    ]);

    expect(countDuplicateExcelIdSkips(groups)).toBe(4);
  });
});
