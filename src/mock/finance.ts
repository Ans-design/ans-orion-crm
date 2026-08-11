export type MockCharge = {
  id: string;
  label: string;
  category: string;
  amountMGA: number;
  month: string;
};

export const mockFinance = {
  month: '2026-06',
  charges: [
    { id: 'ch-1', label: 'Encres & consommables', category: 'Matières', amountMGA: 4_200_000, month: '2026-06' },
    { id: 'ch-2', label: 'Électricité atelier', category: 'Énergie', amountMGA: 1_850_000, month: '2026-06' },
    { id: 'ch-3', label: 'Maintenance Mimaki', category: 'Maintenance', amountMGA: 950_000, month: '2026-06' },
  ] satisfies MockCharge[],
  revenueMGA: 48_200_000,
  marginPct: 32,
};
