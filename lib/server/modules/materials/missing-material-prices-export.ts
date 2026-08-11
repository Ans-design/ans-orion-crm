import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';

export type MissingMaterialPriceExportRow = {
  ID: string;
  Famille: string;
  'Nom matière': string;
  'Type caractéristique': string;
  'Valeur caractéristique': string;
  'Unité caractéristique': string;
  'Unité prix': string;
  'Prix base': string | number;
  'Prix achat': number | '';
  Plafond: number | '';
  'Clé matière': string;
  Grammage: string;
  Note: string;
};

export async function listMissingBaseMaterialPriceRows() {
  return prisma.baseMaterial.findMany({
    where: {
      active: true,
      archived: false,
      impactsPrice: true,
      OR: [{ basePrintPrice: null }, { basePrintPrice: { lte: 0 } }],
    },
    orderBy: [{ family: 'asc' }, { label: 'asc' }],
  });
}

export function mapMissingPriceExportRows(
  rows: Awaited<ReturnType<typeof listMissingBaseMaterialPriceRows>>,
): MissingMaterialPriceExportRow[] {
  return rows.map((r) => {
    const charType = r.thickness?.includes('mm') ? 'épaisseur' : r.grammage ? 'grammage' : 'autre';
    const charValue = r.grammage || r.thickness || '';
    return {
      ID: r.id,
      Famille: r.family,
      'Nom matière': r.label,
      'Type caractéristique': charType,
      'Valeur caractéristique': charValue,
      'Unité caractéristique': charType === 'épaisseur' ? 'mm' : charType === 'grammage' ? 'g' : '',
      'Unité prix': r.saleUnit || 'feuille',
      'Prix base': '',
      'Prix achat': r.purchasePrice ?? '',
      Plafond: r.maxPrice ?? '',
      'Clé matière': r.materialKey,
      Grammage: r.grammage ?? '',
      Note: 'Remplir Prix base puis réimporter via Stock & Matières',
    };
  });
}

export async function buildMissingMaterialPricesXlsxBuffer(): Promise<{
  buffer: Buffer;
  count: number;
  filename: string;
}> {
  const rows = await listMissingBaseMaterialPriceRows();
  const exportRows = mapMissingPriceExportRows(rows);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Prix manquants');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  const day = new Date().toISOString().slice(0, 10);
  return {
    buffer,
    count: exportRows.length,
    filename: `ans-orion-matieres-prix-manquants-${day}.xlsx`,
  };
}
