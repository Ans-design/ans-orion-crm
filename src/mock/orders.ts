export type MockOrder = {
  id: string;
  ref: string;
  client: string;
  status: string;
  totalMGA: number;
  dueDate: string;
};

export const mockOrders: MockOrder[] = [
  { id: 'cmd-1042', ref: 'DEV-2026-1042', client: 'Hotel Carlton', status: 'En production', totalMGA: 1_240_000, dueDate: '2026-07-02' },
  { id: 'cmd-1043', ref: 'DEV-2026-1043', client: 'Jumbo Score', status: 'Devis envoyé', totalMGA: 680_000, dueDate: '2026-07-05' },
  { id: 'cmd-1044', ref: 'DEV-2026-1044', client: 'BNI Madagascar', status: 'Livré', totalMGA: 3_100_000, dueDate: '2026-06-18' },
  { id: 'cmd-1045', ref: 'DEV-2026-1045', client: 'Ambassade FR', status: 'BAT en attente', totalMGA: 520_000, dueDate: '2026-07-08' },
];
