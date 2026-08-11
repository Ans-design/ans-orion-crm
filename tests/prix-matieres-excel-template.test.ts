import { describe, expect, it } from 'vitest';
import { buildPrixMatieresStockTemplateWorkbook } from '@/lib/backoffice/prix-matieres-stock-excel-templates';

describe('modèle Excel Prix / Matières / Stock', () => {
  it('contient le guide et les feuilles importables', () => {
    const wb = buildPrixMatieresStockTemplateWorkbook();
    const names = wb.SheetNames;
    expect(names).toContain('00_Guide');
    expect(names).toContain('01_Matieres_Stock');
    expect(names).toContain('02_Prix_Base');
    expect(names).toContain('02_Prix_Par_Contexte');
    expect(names).toContain('03_Impression_Sans_Finition');
    expect(names).toContain('04_Grand_Format');
    expect(names).toContain('13_Anomalies_Catalogue');
  });
});
