export type MockPricingRule = {
  id: string;
  label: string;
  type: 'marge' | 'remise' | 'minimum';
  value: number;
  appliesTo: string;
};

export const mockPricing: MockPricingRule[] = [
  { id: 'pr-1', label: 'Marge standard impression', type: 'marge', value: 35, appliesTo: 'Impression numérique' },
  { id: 'pr-2', label: 'Remise client fidèle', type: 'remise', value: 8, appliesTo: 'Clients or' },
  { id: 'pr-3', label: 'Minimum commande covering', type: 'minimum', value: 2_000_000, appliesTo: 'Covering' },
  { id: 'pr-4', label: 'Marge finition', type: 'marge', value: 25, appliesTo: 'Finition / façonnage' },
];
