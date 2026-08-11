import type { StockItemExtended } from './stock.types';
import { computeMarginPct, computeNetBenefit } from '@/lib/utils/stock-price';

export type StockAnomalyLevel = 'info' | 'warning' | 'critique';

export type StockAnomaly = {
  code: string;
  level: StockAnomalyLevel;
  module: string;
  message: string;
  action?: string;
};

export function detectStockItemAnomalies(item: StockItemExtended & {
  stockCategory?: string;
  salePrice?: number | null;
  sku?: string;
  family?: string | null;
  additionalCost?: number | null;
  maxQty?: number | null;
  archived?: boolean;
}): StockAnomaly[] {
  const anomalies: StockAnomaly[] = [];
  const cat = item.stockCategory ?? 'matiere_interne';
  const cost = (item.unitCost ?? 0) + (item.additionalCost ?? 0);
  const margin = computeMarginPct(item.salePrice, cost > 0 ? cost : item.unitCost);
  const benefit = computeNetBenefit(item.salePrice, cost > 0 ? cost : item.unitCost);

  if (!item.sku?.trim()) {
    anomalies.push({ code: 'SKU_MISSING', level: 'critique', module: 'stock', message: 'SKU manquant', action: 'Régénérer SKU' });
  }
  if (!item.label?.trim()) {
    anomalies.push({ code: 'LABEL_MISSING', level: 'critique', module: 'stock', message: 'Libellé manquant' });
  }
  if (!cat) {
    anomalies.push({ code: 'CATEGORY_MISSING', level: 'warning', module: 'stock', message: 'Catégorie stock manquante' });
  }
  if (cat === 'vente_directe' && (item.salePrice == null || item.salePrice <= 0)) {
    anomalies.push({ code: 'SALE_PRICE_REQUIRED', level: 'critique', module: 'stock', message: 'Prix vente obligatoire (vente directe)' });
  }
  if (item.unitCost == null || item.unitCost < 0) {
    anomalies.push({ code: 'PURCHASE_PRICE_MISSING', level: 'warning', module: 'stock', message: 'Prix achat manquant' });
  }
  if (item.vendableDirectement && (item.salePrice == null || item.salePrice <= 0)) {
    anomalies.push({ code: 'SALE_PRICE_VENDABLE', level: 'warning', module: 'stock', message: 'Prix vente manquant pour article vendable' });
  }
  if (item.unitDisplay && item.unitDisplay !== item.unit && (item.conversionFactor == null || item.conversionFactor <= 0)) {
    anomalies.push({ code: 'CONVERSION_MISSING', level: 'warning', module: 'stock', message: 'Conversion unité manquante' });
  }
  if (item.quantity < 0) {
    anomalies.push({ code: 'NEGATIVE_STOCK', level: 'critique', module: 'stock', message: 'Stock négatif' });
  }
  if (item.quantity <= 0) {
    anomalies.push({ code: 'OUT_OF_STOCK', level: 'critique', module: 'stock', message: 'Rupture de stock' });
  } else if (item.quantity <= item.minQty) {
    anomalies.push({ code: 'LOW_STOCK', level: 'warning', module: 'stock', message: 'Stock critique / faible' });
  }
  if (benefit != null && benefit < 0) {
    anomalies.push({ code: 'NEGATIVE_MARGIN', level: 'warning', module: 'stock', message: 'Bénéfice net négatif' });
  }
  if (item.salePrice != null && cost > 0 && item.salePrice < cost) {
    anomalies.push({ code: 'SALE_BELOW_COST', level: 'warning', module: 'stock', message: 'Prix vente inférieur au prix de revient' });
  }
  if ((cat === 'hybride' || cat === 'matiere_interne') && !item.baseMaterialId) {
    anomalies.push({ code: 'MATERIAL_NOT_LINKED', level: 'info', module: 'matieres', message: 'Non lié à Matières DB', action: 'Lier matière' });
  }
  if (cat === 'maintenance_piece' && !item.machineCompatible) {
    anomalies.push({ code: 'MACHINE_MISSING', level: 'info', module: 'maintenance', message: 'Pièce sans machine compatible' });
  }
  if (!item.supplier?.trim() && !item.supplierId) {
    anomalies.push({ code: 'SUPPLIER_MISSING', level: 'info', module: 'fournisseurs', message: 'Fournisseur non renseigné' });
  }

  return anomalies;
}

export function countAnomaliesByLevel(anomalies: StockAnomaly[]) {
  return {
    info: anomalies.filter((a) => a.level === 'info').length,
    warning: anomalies.filter((a) => a.level === 'warning').length,
    critique: anomalies.filter((a) => a.level === 'critique').length,
  };
}
