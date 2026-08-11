import type { StockCategoryId } from '@/lib/data/stock-categories';

export type StockFormVisibility = {
  showPaperType: boolean;
  showGrammage: boolean;
  showFormat: boolean;
  showColor: boolean;
  showSize: boolean;
  showCapacity: boolean;
  showThickness: boolean;
  showMachine: boolean;
  showBrand: boolean;
  showUnits: boolean;
  showPricing: boolean;
  showSalePrice: boolean;
  showBasePrintPrice: boolean;
  showLinkMaterial: boolean;
  showPosToggles: boolean;
  showVendable: boolean;
  showUsableProduction: boolean;
  showLinkMachine: boolean;
};

const PAPER_FAMILIES = ['papier', 'grand format', 'vinyle', 'bâche', 'bache', 'support'];
const TEXTILE_FAMILIES = ['textile', 'goodies', 'objet', 'promo'];
const RIGID_FAMILIES = ['rigide', 'plaque', 'dibond', 'pvc', 'carton'];

function familyMatch(family: string, list: string[]) {
  const f = family.toLowerCase();
  return list.some((k) => f.includes(k));
}

export function getStockFormVisibility(
  stockCategory: StockCategoryId | string,
  family: string,
): StockFormVisibility {
  const cat = stockCategory as StockCategoryId;
  const isPaper = familyMatch(family, PAPER_FAMILIES) || cat === 'matiere_interne';
  const isTextile = familyMatch(family, TEXTILE_FAMILIES);
  const isRigid = familyMatch(family, RIGID_FAMILIES);
  const isMaintenance = cat === 'maintenance_piece';
  const isVenteDirecte = cat === 'vente_directe';
  const isHybride = cat === 'hybride';
  const isMatiere = cat === 'matiere_interne';

  return {
    showPaperType: isMatiere || isHybride || isPaper,
    showGrammage: isMatiere || isHybride || isPaper,
    showFormat: isMatiere || isHybride || isPaper || isRigid,
    showColor: isTextile || isHybride || isVenteDirecte,
    showSize: isTextile || isHybride,
    showCapacity: isTextile || isHybride || isVenteDirecte,
    showThickness: isRigid || isMatiere,
    showMachine: isMaintenance,
    showBrand: isVenteDirecte || isHybride,
    showUnits: !isMaintenance || isMatiere,
    showPricing: true,
    showSalePrice: isVenteDirecte || isHybride || isMaintenance,
    showBasePrintPrice: isMatiere || isHybride,
    showLinkMaterial: isMatiere || isHybride,
    showPosToggles: isMatiere || isHybride,
    showVendable: !isMatiere,
    showUsableProduction: isMatiere || isHybride || isMaintenance,
    showLinkMachine: isMaintenance,
  };
}

export function stockStatusClient(
  quantity: number,
  minQty: number,
  reservedQty = 0,
): 'ok' | 'critique' | 'rupture' {
  if (quantity <= 0) return 'rupture';
  const available = Math.max(0, quantity - (reservedQty ?? 0));
  if (available <= minQty) return 'critique';
  return 'ok';
}

export function stockCategoryLabel(id: string): string {
  const map: Record<string, string> = {
    vente_directe: 'Vente directe',
    hybride: 'Hybride',
    matiere_interne: 'Matière interne',
    maintenance_piece: 'Maintenance',
  };
  return map[id] ?? id;
}
