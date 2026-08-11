export type MockDashboardKpi = {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'flat';
  delta?: string;
};

export const mockDashboard = {
  period: 'Juin 2026',
  kpis: [
    { label: 'CA mensuel', value: '48,2 M Ar', trend: 'up', delta: '+12 %' },
    { label: 'Devis en cours', value: 23, trend: 'flat' },
    { label: 'Commandes actives', value: 17, trend: 'up', delta: '+3' },
    { label: 'Dossiers GPAO bloqués', value: 1, trend: 'down', delta: '-2' },
  ] satisfies MockDashboardKpi[],
  alerts: [
    'Stock dibond sous seuil magasin A',
    '1 dossier GPAO bloqué — qualité',
    'Relance devis Jumbo Score (+5 j)',
  ],
};
