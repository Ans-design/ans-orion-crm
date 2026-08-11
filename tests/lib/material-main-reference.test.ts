import { describe, expect, it } from 'vitest';
import {
  generateMainReference,
  formatExcelRowId,
  parseExcelIdColumn,
} from '@/lib/backoffice/material-main-reference';

describe('generateMainReference', () => {
  it('génère PAPIE-80G pour Papier STD 80g', () => {
    expect(
      generateMainReference({ materialName: 'Papier STD', characteristicType: 'grammage', value: '80g' }),
    ).toBe('PAPIE-80G');
  });

  it('génère PCM-130G', () => {
    expect(
      generateMainReference({ materialName: 'PCM', characteristicType: 'grammage', value: '130g' }),
    ).toBe('PCM-130G');
  });

  it('génère TTTTT-TTT', () => {
    expect(
      generateMainReference({ materialName: 'TTTTTTTTTT', characteristicType: 'ttt', value: 'ttt' }),
    ).toBe('TTTTT-TTT');
  });

  it('parse ID simple 001', () => {
    expect(parseExcelIdColumn('001')).toEqual({ excelRowId: '001' });
    expect(parseExcelIdColumn('1')).toEqual({ excelRowId: '001' });
    expect(formatExcelRowId(2)).toBe('002');
  });
});
