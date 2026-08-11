export type MockProduct = {
  id: string;
  ref: string;
  name: string;
  family: string;
  priceMGA: number;
  unit: string;
  active: boolean;
};

export const mockProducts: MockProduct[] = [
  { id: 'art-001', ref: 'BAN-3x1', name: 'Bâche 3×1 m', family: 'Bâche', priceMGA: 185_000, unit: 'pièce', active: true },
  { id: 'art-002', ref: 'PAN-ALU', name: 'Panneau alu dibond 3 mm', family: 'Panneau', priceMGA: 420_000, unit: 'm²', active: true },
  { id: 'art-003', ref: 'VIN-VHL', name: 'Covering véhicule complet', family: 'Covering', priceMGA: 3_500_000, unit: 'forfait', active: true },
  { id: 'art-004', ref: 'AFF-A3', name: 'Affiche A3 170 g', family: 'Affiche', priceMGA: 2_500, unit: 'pièce', active: true },
  { id: 'art-005', ref: 'PLV-X', name: 'PLV comptoir pliable', family: 'PLV', priceMGA: 95_000, unit: 'pièce', active: false },
];
