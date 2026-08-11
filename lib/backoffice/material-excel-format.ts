import {
  characteristicTypeLabel,
  formatExcelRowId,
  generateMainReference,
  isValidMaterialName,
  normalizePriceUnit,
  parseExcelIdColumn,
} from '@/lib/backoffice/material-main-reference';
import {
  decodeSecondaryCharacteristic,
  deriveMaterialTableFields,
  encodeSecondaryCharacteristic,
  type CharacteristicType,
} from '@/lib/backoffice/material-table-fields';
import { parseCharacteristicTypeLabel } from '@/lib/backoffice/material-import-key';
import {
  resolveBlankSellPrice,
  resolveMarginGainAr,
  resolvePrintPrice,
} from '@/lib/backoffice/material-price-semantics';
import { deriveMaterialMasterExtensions } from '@/lib/backoffice/material-master-row';
import type { MaterialPriceUnifiedRow } from '@/components/backoffice-v2/pricing-custom/material-prices/types';
export const MATERIAL_EXCEL_COLUMNS = [
  'MATIÈRE',
  'TYPE CARACTÉRISTIQUE',
  'VALEUR',
  'RÉFÉRENCE PRINCIPALE',
  'PRIX BASE',
  'UNITÉ PRIX',
  'DÉTAIL AUTRE',
  'ID',
] as const;

/**
 * Export « vue tableau » Matières & tarifs — miroir colonnes UI (Tarification + dispo).
 */
export const MATERIAL_TABLE_EXPORT_COLUMNS = [
  'ID',
  'Référence principale',
  'Matière',
  'Type',
  'Valeur',
  'Famille',
  'Type secondaire',
  'Valeur secondaire',
  'Unité',
  'Prix matière',
  'Marge de gain',
  'Prix imprimé',
  'Stock',
  'Disponibilité',
  'Statut',
] as const;

export type MaterialExcelColumn = (typeof MATERIAL_EXCEL_COLUMNS)[number];
export type MaterialExcelRow = Record<MaterialExcelColumn, string | number>;
export type MaterialTableExportColumn = (typeof MATERIAL_TABLE_EXPORT_COLUMNS)[number];
export type MaterialTableExportRow = Record<MaterialTableExportColumn, string | number>;

export function materialRowToExcel(
  row: MaterialPriceUnifiedRow,
  excelRowId?: string | null,
): MaterialExcelRow {
  const f = deriveMaterialTableFields(row);
  const charType = f.mainCharacteristic?.type ?? 'autre';
  const charValue = f.mainCharacteristic?.displayValue ?? '';
  const storedRef = row.materialKey?.trim() ?? '';
  const ref =
    storedRef && !storedRef.startsWith('catalog-') && storedRef.length < 64
      ? storedRef
      : generateMainReference({
          materialName: f.materialName,
          characteristicType: charType,
          value: charValue,
          secondDetail: (row.anomalyNotes ?? '').trim() || null,
        });

  const materialName = isValidMaterialName(f.materialName) ? f.materialName : 'À compléter';

  return {
    MATIÈRE: materialName,
    'TYPE CARACTÉRISTIQUE': characteristicTypeLabel(charType),
    VALEUR: charValue,
    'RÉFÉRENCE PRINCIPALE': ref,
    'PRIX BASE': row.basePrintPrice ?? '',
    'UNITÉ PRIX': normalizePriceUnit(row.unit || row.unitDisplay || ''),
    'DÉTAIL AUTRE': (row.anomalyNotes ?? '').trim(),
    ID: excelRowId
      ? /^\d+$/.test(excelRowId) ? formatExcelRowId(parseInt(excelRowId, 10)) : excelRowId
      : row.excelRowId
        ? /^\d+$/.test(row.excelRowId) ? formatExcelRowId(parseInt(row.excelRowId, 10)) : row.excelRowId
        : '',
  };
}

function formatExportId(row: MaterialPriceUnifiedRow): string {
  const excelId = row.excelRowId?.trim();
  if (excelId) {
    return /^\d+$/.test(excelId) ? formatExcelRowId(parseInt(excelId, 10)) : excelId;
  }
  return row.id;
}

/** Ligne Excel alignée sur le tableau Matières & tarifs (colonnes strictes). */
export function materialRowToTableExport(row: MaterialPriceUnifiedRow): MaterialTableExportRow {
  const f = deriveMaterialTableFields(row);
  const main = f.mainCharacteristic;
  const secondary = decodeSecondaryCharacteristic(row.anomalyNotes);

  const blank = resolveBlankSellPrice(row);
  const print = resolvePrintPrice(row);
  const marginGain = resolveMarginGainAr(row);
  const ext = deriveMaterialMasterExtensions(row);
  const stockQty =
    ext.stockDisponible
    ?? row.stockDisponible
    ?? row.stockAvailable
    ?? (row.stockPhysical != null
      ? Math.max(0, Number(row.stockPhysical) - Number(row.stockReserved ?? 0))
      : null);

  const dispo =
    stockQty == null
      ? 'Sur commande'
      : stockQty <= 0
        ? 'Rupture'
        : stockQty < 10
          ? 'Stock faible'
          : 'Disponible';

  const statutRaw = String(row.publicationStatus ?? '').toLowerCase();
  const statut =
    statutRaw === 'published' || statutRaw === 'publié'
      ? 'publié'
      : statutRaw === 'archived' || statutRaw === 'archivé'
        ? 'archivé'
        : statutRaw
          ? 'brouillon'
          : '';

  return {
    ID: formatExportId(row),
    'Référence principale':
      f.primaryReference && f.primaryReference !== '—'
        ? f.primaryReference
        : (row.materialKey?.trim() || ''),
    Matière: isValidMaterialName(f.materialName) ? f.materialName : 'À compléter',
    Type: main ? characteristicTypeLabel(main.type) : '',
    Valeur: main?.displayValue ?? (f.grammage || f.thickness || ''),
    Famille: f.family !== '—' ? f.family : (row.family ?? ''),
    'Type secondaire': secondary ? characteristicTypeLabel(secondary.type) : '',
    'Valeur secondaire': secondary?.value ?? '',
    Unité: normalizePriceUnit(row.unitDisplay || row.unit || ''),
    'Prix matière': blank ?? '',
    'Marge de gain': marginGain ?? '',
    'Prix imprimé': print ?? '',
    Stock: stockQty != null ? stockQty : '',
    Disponibilité: dispo,
    Statut: statut,
  };
}

export function excelRowToCanonical(line: Record<string, unknown>): Record<string, unknown> {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = line[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        return typeof v === 'string' ? v.trim() : v;
      }
    }
    return '';
  };

  const idRaw = pick('ID', 'id', 'Id', 'identifiant');
  const { excelRowId, technicalId } = parseExcelIdColumn(idRaw);

  /** Prix imprimé (export tableau) = prix base catalogue commercial. */
  const prixBase = pick(
    'PRIX BASE',
    'Prix base',
    'prix base',
    'Prix imprimé',
    'Prix imprime',
    'Prix',
  );
  const prixMatiere = pick(
    'Prix matière',
    'Prix matiere',
    'Prix vierge',
    'blankSellPrice',
  );
  const margeGain = pick('Marge de gain', 'Marge', 'marginGain');

  const type2Raw = String(
    pick('Type secondaire', 'TYPE SECONDAIRE', 'Type 2', 'caractère secondaire') || '',
  );
  const value2Raw = String(
    pick('Valeur secondaire', 'VALEUR SECONDAIRE', 'Valeur 2') || '',
  );
  const legacyDetail = String(
    pick('DÉTAIL AUTRE', 'Détail autre', 'Détails autres', 'Details autres') || '',
  );
  let detailsAutres = legacyDetail;
  if (value2Raw) {
    const type2 = parseCharacteristicTypeLabel(type2Raw || 'autre');
    detailsAutres = encodeSecondaryCharacteristic(type2, value2Raw, legacyDetail) ?? value2Raw;
  }

  const stockHint = pick('Stock', 'STOCK', 'stock', 'Qté', 'Quantité');

  return {
    Matière: pick('MATIÈRE', 'Matière', 'Matiere', 'matiere', 'material', 'Nom'),
    'Type caractéristique': pick(
      'TYPE CARACTÉRISTIQUE',
      'Type caractéristique',
      'Type caractere',
      'Type caracté',
      'Type',
    ),
    Valeur: pick('VALEUR', 'Valeur', 'valeur'),
    Famille: pick('Famille', 'FAMILLE', 'family', 'categorie', 'Catégorie'),
    'Référence principale': pick(
      'RÉFÉRENCE PRINCIPALE',
      'Référence principale',
      'Référence pri',
      'Reference principale',
      'ref',
    ),
    'Prix base': prixBase,
    'Prix matière': prixMatiere,
    'Marge de gain': margeGain,
    'Unité prix': pick(
      'UNITÉ PRIX',
      'Unité prix',
      'Unite prix',
      'Unité',
      'Unite',
      'unit',
    ),
    'Détails autres': detailsAutres,
    Stock: stockHint,
    ID: technicalId ?? '',
    excelRowId: excelRowId ?? '',
  };
}

export function validateMaterialExcelRows(rows: Record<string, unknown>[]): {
  ok: boolean;
  materialColumn?: string;
  message?: string;
} {
  if (!rows.length) {
    return { ok: false, message: 'Fichier vide ou sans données après la ligne d\'en-têtes.' };
  }
  const canonical = rows.map(excelRowToCanonical);
  const withName = canonical.filter((r) => String(r.Matière ?? '').trim() !== '').length;
  if (withName === 0) {
    const keys = Object.keys(rows[0] ?? {});
    return {
      ok: false,
      message: `Colonne MATIÈRE introuvable. En-têtes : ${keys.slice(0, 8).join(', ') || 'aucun'}`,
    };
  }
  return { ok: true, materialColumn: 'MATIÈRE' };
}

export function emptyMaterialExcelTemplate(): MaterialExcelRow[] {
  return [
    {
      MATIÈRE: 'Papier STD',
      'TYPE CARACTÉRISTIQUE': 'grammage',
      VALEUR: '80g',
      'RÉFÉRENCE PRINCIPALE': 'PAPIE-80G',
      'PRIX BASE': 200,
      'UNITÉ PRIX': 'feuille',
      'DÉTAIL AUTRE': '',
      ID: formatExcelRowId(1),
    },
    {
      MATIÈRE: 'PCM',
      'TYPE CARACTÉRISTIQUE': 'grammage',
      VALEUR: '130g',
      'RÉFÉRENCE PRINCIPALE': 'PCM-130G',
      'PRIX BASE': 1000,
      'UNITÉ PRIX': 'feuille',
      'DÉTAIL AUTRE': '',
      ID: formatExcelRowId(2),
    },
  ];
}

export type { CharacteristicType };
