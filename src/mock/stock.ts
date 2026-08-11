export type MockStockItem = {
  id: string;
  sku: string;
  label: string;
  qty: number;
  unit: string;
  alertThreshold: number;
  location: string;
};

export const mockStock: MockStockItem[] = [
  { id: 'stk-1', sku: 'ENC-BAN-440', label: 'Encre bâche cyan 440 ml', qty: 12, unit: 'cartouche', alertThreshold: 4, location: 'Magasin A' },
  { id: 'stk-2', sku: 'VIN-WHITE', label: 'Vinyle adhésif blanc 1,37 m', qty: 85, unit: 'm', alertThreshold: 30, location: 'Magasin B' },
  { id: 'stk-3', sku: 'ALU-3MM', label: 'Dibond 3 mm 1,25×2,5', qty: 6, unit: 'feuille', alertThreshold: 10, location: 'Magasin A' },
  { id: 'stk-4', sku: 'LAM-MAT', label: 'Film lamination mat', qty: 120, unit: 'm', alertThreshold: 40, location: 'Finition' },
];
