export type MockDossier = {
  id: string;
  ref: string;
  commande: string;
  statut: string;
  priorite: string;
  machine?: string;
};

export const mockProduction: MockDossier[] = [
  { id: 'gpao-88', ref: 'GP-2026-088', commande: 'DEV-2026-1042', statut: 'En cours', priorite: 'Haute', machine: 'Mimaki JV300' },
  { id: 'gpao-89', ref: 'GP-2026-089', commande: 'DEV-2026-1038', statut: 'Bloqué', priorite: 'Normale', machine: 'Zünd G3' },
  { id: 'gpao-90', ref: 'GP-2026-090', commande: 'DEV-2026-1045', statut: 'Préparation', priorite: 'Normale' },
  { id: 'gpao-91', ref: 'GP-2026-091', commande: 'DEV-2026-1031', statut: 'Terminé', priorite: 'Basse', machine: 'Summa DC4' },
];
