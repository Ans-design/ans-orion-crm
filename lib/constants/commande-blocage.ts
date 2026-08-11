/** Raisons de blocage commande — audit ORION §15 */
export const COMMANDE_BLOCAGE_RAISONS = [
  'Fichier manquant',
  'BAT non validé',
  'Matière manquante',
  'Machine en panne',
  'Acompte absent',
  'Client injoignable',
  'Erreur de dimension',
  'Contrôle qualité refusé',
  'Facture impayée',
  'Problème livraison',
  'Autre',
] as const;

export type CommandeBlocageRaison = (typeof COMMANDE_BLOCAGE_RAISONS)[number];
