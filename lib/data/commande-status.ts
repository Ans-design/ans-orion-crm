/** Statuts commande — alignés seed, API (Zod) et UI */
export const COMMANDE_STATUTS = [
  'À planifier',
  'En attente stock',
  'En production',
  'En finition',
  'Prête',
  'Livré',
  'En retard',
  'Suspendu',
  'Annulée',
] as const;

export type CommandeStatut = (typeof COMMANDE_STATUTS)[number];

/** Jalons atelier : mettent à jour statut + avancement (sans écraser l'API) */
export const COMMANDE_PRODUCTION_STEPS = [
  { label: 'Validation client', statut: 'À planifier' as CommandeStatut, avancement: 10 },
  { label: 'BAT envoyé', statut: 'À planifier' as CommandeStatut, avancement: 20 },
  { label: 'BAT approuvé', statut: 'En production' as CommandeStatut, avancement: 30 },
  { label: 'En impression', statut: 'En production' as CommandeStatut, avancement: 50 },
  { label: 'Façonnage', statut: 'En finition' as CommandeStatut, avancement: 75 },
  { label: 'Prêt à livrer', statut: 'Prête' as CommandeStatut, avancement: 90 },
  { label: 'Livrée', statut: 'Livré' as CommandeStatut, avancement: 100 },
] as const;
