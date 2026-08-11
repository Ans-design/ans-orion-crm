/** Champs StockItem étendus (schema Prisma — regénérer client après db push) */
export type StockItemExtended = {
  id: string;
  sku: string;
  label: string;
  category: string;
  stockCategory?: string;
  vendableDirectement?: boolean;
  paperType?: string | null;
  grammage?: string | null;
  thickness?: string | null;
  color?: string | null;
  formatLabel?: string | null;
  characteristic?: string | null;
  unit?: string;
  unitDisplay?: string | null;
  unitStandard?: string | null;
  conversionFactor?: number | null;
  quantity: number;
  reservedQty?: number;
  minQty: number;
  unitCost?: number | null;
  salePrice?: number | null;
  supplier?: string | null;
  supplierId?: string | null;
  machineCompatible?: string | null;
  family?: string | null;
  additionalCost?: number | null;
  baseMaterialId?: string | null;
  materialKey?: string | null;
  stockKind?: string | null;
  yieldM2?: number | null;
  yieldUnit?: string | null;
  site?: string;
};

export function asStockExtended(stock: unknown): StockItemExtended {
  return stock as StockItemExtended;
}
