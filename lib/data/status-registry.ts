import {
  COMMANDE_STATUTS,
  type CommandeStatut,
} from '@/lib/data/commande-status';

/** Statuts devis — référentiel unique */
export const DEVIS_STATUTS = [
  'Brouillon',
  'Envoyé',
  'En attente',
  'Accepté',
  'Refusé',
  'Expiré',
] as const;
export type DevisStatut = (typeof DEVIS_STATUTS)[number];

/** Statuts livraison */
export const LIVRAISON_STATUTS = [
  'Préparation',
  'Prêt',
  'En livraison',
  'Livré',
  'Retour',
] as const;
export type LivraisonStatut = (typeof LIVRAISON_STATUTS)[number];

/** Statuts production atelier */
export const PRODUCTION_STATUTS = [
  'En attente',
  'En cours',
  'Terminé',
  'Bloqué',
] as const;
export type ProductionStatut = (typeof PRODUCTION_STATUTS)[number];

/** Statuts BAT / proof */
export const PROOF_STATUTS = [
  'En attente',
  'Envoyé',
  'Validé',
  'Refusé',
] as const;
export type ProofStatut = (typeof PROOF_STATUTS)[number];

/** Statuts contrôle qualité */
export const QUALITE_STATUTS = [
  'En attente contrôle',
  'Conforme',
  'Non conforme',
  'A refaire',
  'Accepte avec reserve',
] as const;
export type QualiteStatutRegistry = (typeof QUALITE_STATUTS)[number];

/** Statuts paiement document */
export const PAIEMENT_STATUTS = [
  'Non payé',
  'Acompte reçu',
  'Partiellement payé',
  'Payé',
  'En retard',
  'Annulé',
] as const;
export type PaiementStatut = (typeof PAIEMENT_STATUTS)[number];

/** Modes et types paiement */
export const PAIEMENT_MODES = [
  'Espèces',
  'Virement',
  'Chèque',
  'Mobile Money',
  'Carte',
] as const;

export const PAIEMENT_TYPES = [
  'Acompte',
  'Solde',
  'Remboursement',
] as const;

/** Valeurs legacy → statuts canoniques commande */
const LEGACY_COMMANDE_MAP: Record<string, CommandeStatut> = {
  Livrée: 'Livré',
  Terminée: 'Prête',
  Terminé: 'Prête',
  'En cours': 'En production',
  'En attente de production': 'À planifier',
  En_retard: 'En retard',
  'en retard': 'En retard',
  /** Clés enum Prisma brutes parfois remontées par l’API */
  Livre: 'Livré',
  Livree: 'Livré',
  Prete: 'Prête',
  A_planifier: 'À planifier',
  En_attente_stock: 'En attente stock',
  En_production: 'En production',
  En_finition: 'En finition',
  Annulee: 'Annulée',
  Terminee: 'Prête',
};

export function isCommandeStatutValue(value: string): value is CommandeStatut {
  return (COMMANDE_STATUTS as readonly string[]).includes(value);
}

/** Normalise un statut commande (legacy seed / anciennes API). */
export function normalizeCommandeStatut(raw: string): CommandeStatut {
  const value = (raw ?? '').trim();
  if (!value) return 'À planifier';
  if (isCommandeStatutValue(value)) return value;
  if (LEGACY_COMMANDE_MAP[value]) return LEGACY_COMMANDE_MAP[value]!;
  const lower = value.toLowerCase();
  if (LEGACY_COMMANDE_MAP[lower]) return LEGACY_COMMANDE_MAP[lower]!;
  // Ne jamais écraser un statut inconnu vers « À planifier » silencieusement
  // si la chaîne contient déjà un libellé canonique (ex. enum Prisma brut).
  return 'À planifier';
}

/** Filtre Prisma : commandes considérées comme terminées (stats, cockpit). */
export const COMMANDE_DONE_STATUTS: CommandeStatut[] = ['Livré', 'Annulée', 'Suspendu'];

/** Inclut les valeurs legacy encore en base (avant migration). */
export const COMMANDE_DONE_DB_STATUTS = [
  'Livré',
  'Livrée',
  'Terminée',
  'Annulée',
  'Suspendu',
] as const;

export function isCommandeDone(statut: string): boolean {
  const n = normalizeCommandeStatut(statut);
  return COMMANDE_DONE_STATUTS.includes(n);
}

export const DEVIS_PENDING_STATUTS: DevisStatut[] = ['Brouillon', 'Envoyé', 'En attente'];

export const FACTURE_UNPAID_STATUTS = ['Émise', 'Partiellement payée'] as const;
