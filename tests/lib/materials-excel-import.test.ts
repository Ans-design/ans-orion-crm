import { describe, expect, it } from 'vitest';

import { buildMaterialImportKey } from '@/lib/backoffice/material-import-key';

import {

  dedupeExcelMaterialLines,

  normalizeExcelMaterialRow,

  resolveImportTarget,

} from '@/lib/server/modules/materials/materials-excel-import.service';

import type { BaseMaterialRow } from '@/lib/server/modules/pricing/base-material.repository';



function mockRow(overrides: Partial<BaseMaterialRow> & { id: string; label: string }): BaseMaterialRow {

  return {

    materialKey: 'acrylic-3mm',

    family: 'Grand format',

    grammage: null,

    thickness: '3',

    formatStandard: null,

    widthMm: null,

    heightMm: null,

    dimensionUnit: 'mm',

    saleUnit: 'm2',

    unitDisplay: 'm2',

    basePrintType: null,

    purchasePrice: null,

    basePrintPrice: 1000,

    maxPrice: null,

    targetMargin: null,

    minMargin: null,

    active: true,

    visiblePos: true,

    impactsPrice: true,

    impactsStock: true,

    source: 'catalog',

    anomalyNotes: null,

    publicationStatus: 'draft',

    updatedAt: new Date(),

    normalizedName: 'acrylic',

    displayName: 'Acrylic 3mm',

    archived: false,

    ...overrides,

  } as BaseMaterialRow;

}



const emptyRefMap = new Map<string, BaseMaterialRow>();



describe('resolveImportTarget', () => {

  it('met à jour par ID même si la clé composite a changé', () => {

    const acrylic = mockRow({ id: 'cmr874ilu000jtlc8ntvp2g36', label: 'Acrylic 3mm', thickness: '3' });

    const byId = new Map([[acrylic.id, acrylic]]);

    const byImportKey = new Map([

      [

        buildMaterialImportKey({

          materialName: 'acrylic',

          characteristicType: 'epaisseur',

          characteristicValue: '3',

          priceUnit: 'm2',

          family: 'Grand format',

        }),

        acrylic,

      ],

    ]);



    const importKey = buildMaterialImportKey({

      materialName: 'AAATEST',

      characteristicType: 'epaisseur',

      characteristicValue: 'gfdnghn',

      priceUnit: 'nhgn',

      family: 'fdgbgshb',

    });



    const parsed = {

      lineNo: 3,

      excelRowId: '',

      id: acrylic.id,

      materialName: 'AAATEST',

      materialKeyRef: '',

      referenceFromExcel: false,

      priceUnit: 'nhgn',

      family: 'fdgbgshb',

      charType: 'epaisseur' as const,

      charValue: 'gfdnghn',

      otherDetails: '',

      basePrintPrice: 500,

      blankSellPrice: null,

      targetMargin: null,

      stockQty: null,

      stored: { grammage: null, thickness: 'gfdnghn' },

      importKey,

      visiblePos: true,

      visiblePosProvided: false,

    };



    const result = resolveImportTarget(parsed, new Map(), byId, byImportKey, emptyRefMap);

    expect(result.target?.id).toBe(acrylic.id);

    expect(result.staleExcelId).toBeUndefined();

  });



  it('signale ID technique inconnu pour création', () => {

    const byId = new Map<string, BaseMaterialRow>();

    const byImportKey = new Map<string, BaseMaterialRow>();

    const parsed = {

      lineNo: 2,

      excelRowId: '',

      id: 'cmrunknownunknownunknownunk',

      materialName: 'Nouvelle',

      materialKeyRef: '',

      referenceFromExcel: false,

      priceUnit: 'm2',

      family: 'Autre',

      charType: 'autre' as const,

      charValue: '',

      otherDetails: '',

      basePrintPrice: 100,

      blankSellPrice: null,

      targetMargin: null,

      stockQty: null,

      stored: { grammage: null, thickness: null },

      importKey: 'nouvelle|||m2|autre',

      visiblePos: true,

      visiblePosProvided: false,

    };

    const result = resolveImportTarget(parsed, new Map(), byId, byImportKey, emptyRefMap);

    expect(result.target).toBeUndefined();

    expect(result.staleExcelId).toBe(true);

  });



  it('matche par référence principale (ACRYLIC)', () => {

    const acrylic = mockRow({ id: 'id-acrylic', label: 'Acrylic 3mm', materialKey: 'acrylic' });

    const byMaterialKeyRef = new Map([['acrylic', acrylic]]);

    const parsed = {

      lineNo: 2,

      excelRowId: '',

      id: '',

      materialName: 'ANDRANA',

      materialKeyRef: 'ACRYLIC',

      referenceFromExcel: true,

      priceUnit: 'pcs',

      family: 'Grand format',

      charType: 'epaisseur' as const,

      charValue: '3mm',

      otherDetails: '',

      basePrintPrice: 500000,

      blankSellPrice: null,

      targetMargin: null,

      stockQty: null,

      stored: { grammage: null, thickness: '3' },

      importKey: 'andrana|epaisseur|3mm||pcs|grand format',

      visiblePos: true,

      visiblePosProvided: true,

    };

    const result = resolveImportTarget(
      parsed,
      new Map(),
      new Map(),
      new Map(),
      byMaterialKeyRef,
    );

    expect(result.target?.id).toBe('id-acrylic');

  });

  it('priorise ID Excel simple sur la clé composite', () => {
    const invitation = mockRow({
      id: 'invitation-id',
      label: 'Invitation luxe 200g',
      materialKey: 'invitation-luxe-200g',
      grammage: '200',
      thickness: null,
      excelRowId: '005',
    });
    const byExcelRowId = new Map([['005', invitation]]);

    const parsed = {
      lineNo: 2,
      excelRowId: '005',
      id: '',
      materialName: 'TTTTTTTTTT',
      materialKeyRef: 'ttt',
      referenceFromExcel: true,
      priceUnit: 'nhgn',
      family: 'Autre',
      charType: 'autre' as const,
      charValue: 'ttt',
      otherDetails: 'jty',
      basePrintPrice: 4254224,
      blankSellPrice: null,
      targetMargin: null,
      stockQty: null,
      stored: { grammage: 'ttt', thickness: null },
      importKey: 'tttttttttt|autre|ttt||nhgn|autre',
      visiblePos: true,
      visiblePosProvided: false,
    };

    const result = resolveImportTarget(parsed, byExcelRowId, new Map(), new Map(), new Map());
    expect(result.target?.id).toBe('invitation-id');
    expect(result.staleExcelId).toBeUndefined();
  });

  it('ne matche pas par clé composite si ID Excel inconnu', () => {
    const other = mockRow({
      id: 'other-id',
      label: 'Autre matière',
      materialKey: 'autre-ref',
      grammage: '200',
    });
    const importKey = buildMaterialImportKey({
      materialName: 'TTTTTTTTTT',
      characteristicType: 'autre',
      characteristicValue: 'ttt',
      priceUnit: 'nhgn',
      family: 'Autre',
    });
    const byImportKey = new Map([[importKey, other]]);

    const parsed = {
      lineNo: 2,
      excelRowId: '005',
      id: '',
      materialName: 'TTTTTTTTTT',
      materialKeyRef: 'ttt',
      referenceFromExcel: true,
      priceUnit: 'nhgn',
      family: 'Autre',
      charType: 'autre' as const,
      charValue: 'ttt',
      otherDetails: 'jty',
      basePrintPrice: 4254224,
      blankSellPrice: null,
      targetMargin: null,
      stockQty: null,
      stored: { grammage: 'ttt', thickness: null },
      importKey,
      visiblePos: true,
      visiblePosProvided: false,
    };

    const result = resolveImportTarget(parsed, new Map(), new Map(), byImportKey, new Map());
    expect(result.target).toBeUndefined();
    expect(result.staleExcelId).toBe(true);
  });

});



describe('normalizeExcelMaterialRow', () => {

  it('accepte alias sans accents (export Excel Windows)', () => {

    const row = normalizeExcelMaterialRow({

      Matiere: ' Papier couché ',

      'Type caractere': 'Grammage',

      Valeur: '350',

      Famille: 'Petit format',

      'Prix base': '1200',

      'Unite prix': 'feuille',

    });

    expect(row.Matière).toBe('Papier couché');

    expect(row['Type caractéristique']).toBe('Grammage');

    expect(row['Prix base']).toBe('1200');

  });



  it('accepte colonnes tronquées Excel (Type caracté, Référence pri)', () => {

    const row = normalizeExcelMaterialRow({

      Matière: 'ANDRANA',

      'Type caracté': 'Épaisseur',

      Valeur: '3mm',

      'Référence pri': 'ACRYLIC',

      ID: 'cmr874ilu000jtlc8ntvp2g36',

    });

    expect(row['Type caractéristique']).toBe('Épaisseur');

    expect(row['Référence principale']).toBe('ACRYLIC');

  });

});



describe('dedupeExcelMaterialLines', () => {

  it('garde la 1ère ligne en cas de doublon ID (modifs en haut du fichier)', () => {

    const { lines, duplicateIssues, duplicateIdGroups } = dedupeExcelMaterialLines([

      { ID: 'abc', Matière: 'ANDRANA', Valeur: '3mm' },

      { ID: 'abc', Matière: 'AAATEST', Valeur: 'x' },

      { ID: 'abc', Matière: 'Acrylic 3mm', Valeur: '3mm' },

    ]);

    expect(lines).toHaveLength(1);

    expect(normalizeExcelMaterialRow(lines[0]!).Matière).toBe('ANDRANA');

    expect(duplicateIdGroups).toHaveLength(1);

    expect(duplicateIdGroups[0]!.hasConflictingMaterials).toBe(true);

    expect(duplicateIssues.length).toBeGreaterThanOrEqual(2);

    expect(duplicateIssues.some((i) => i.reason.includes('ANDRANA'))).toBe(true);

    expect(duplicateIssues.some((i) => i.reason.includes('AAATEST'))).toBe(true);

  });

});


