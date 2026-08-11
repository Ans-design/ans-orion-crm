/**
 * Valeurs enum Prisma (identifiants schema.prisma) — zéro import runtime @prisma/client.
 * Évite CommandeStatut undefined lors des imports circulaires Next.js.
 */
import type {
  ClientStatut,
  CommandeStatut,
  DevisStatut,
  FactureStatut,
  LivraisonStatut,
} from '@prisma/client';

export const CMD = {
  A_planifier: 'A_planifier',
  En_attente_stock: 'En_attente_stock',
  En_production: 'En_production',
  En_finition: 'En_finition',
  Prete: 'Prete',
  Livre: 'Livre',
  Suspendu: 'Suspendu',
  Annulee: 'Annulee',
  Livree: 'Livree',
  Terminee: 'Terminee',
  En_retard: 'En_retard',
} as const satisfies Record<string, CommandeStatut>;

export const DEVIS = {
  Brouillon: 'Brouillon',
  Envoye: 'Envoye',
  En_attente: 'En_attente',
  Accepte: 'Accepte',
  Refuse: 'Refuse',
  Expire: 'Expire',
} as const satisfies Record<string, DevisStatut>;

export const FACTURE = {
  Brouillon: 'Brouillon',
  Emise: 'Emise',
  Payee: 'Payee',
  Partiellement_payee: 'Partiellement_payee',
  Annulee: 'Annulee',
} as const satisfies Record<string, FactureStatut>;

export const LIVRAISON = {
  Preparation: 'Preparation',
  Pret: 'Pret',
  En_livraison: 'En_livraison',
  Livre: 'Livre',
  Retour: 'Retour',
} as const satisfies Record<string, LivraisonStatut>;

export const CLIENT = {
  Actif: 'Actif',
  Premium: 'Premium',
  VIP: 'VIP',
  Inactif: 'Inactif',
  Archive: 'Archive',
  Prospect: 'Prospect',
} as const satisfies Record<string, ClientStatut>;

export const COMPLETED_COMMANDE_STATUTS: CommandeStatut[] = [
  CMD.Livre,
  CMD.Livree,
  CMD.Terminee,
  CMD.Annulee,
  CMD.Suspendu,
];

export const PLANIFIER_COMMANDE_STATUTS: CommandeStatut[] = [CMD.A_planifier, CMD.En_attente_stock];

export const ACTIVE_PRODUCTION_COMMANDE_STATUTS: CommandeStatut[] = [
  CMD.En_production,
  CMD.En_finition,
  CMD.Prete,
  CMD.En_attente_stock,
];

export const SHIPPED_COMMANDE_STATUTS: CommandeStatut[] = [
  CMD.Livre,
  CMD.Livree,
  CMD.Terminee,
  CMD.Prete,
];

export const CANCELLED_COMMANDE_STATUTS: CommandeStatut[] = [CMD.Annulee, CMD.Suspendu];

export const COMMANDES_SANS_DEVIS_EXCLUDED: CommandeStatut[] = [
  CMD.Annulee,
  CMD.Livre,
  CMD.Suspendu,
];

export const UNPAID_FACTURE_STATUTS: FactureStatut[] = [FACTURE.Emise, FACTURE.Partiellement_payee];

export const PENDING_DEVIS_STATUTS: DevisStatut[] = [DEVIS.Brouillon, DEVIS.Envoye, DEVIS.En_attente];

export const LOCKED_FACTURE_STATUTS: FactureStatut[] = [FACTURE.Payee, FACTURE.Annulee];

export const ACTIVE_LIVRAISON_PIPELINE: LivraisonStatut[] = [
  LIVRAISON.Preparation,
  LIVRAISON.Pret,
  LIVRAISON.En_livraison,
];

export const READY_TO_SHIP_LIVRAISON: LivraisonStatut[] = [LIVRAISON.Pret, LIVRAISON.En_livraison];

export const COMPLETED_LIVRAISON: LivraisonStatut[] = [LIVRAISON.Livre, LIVRAISON.Retour];

export const DEVIS_EXPIRY_WATCH: DevisStatut[] = [DEVIS.Envoye, DEVIS.En_attente];

export const FIDELE_CLIENT_STATUTS: ClientStatut[] = [CLIENT.VIP, CLIENT.Premium];

export const EXCLUDED_CLIENT_RELANCE: ClientStatut[] = [CLIENT.Archive, CLIENT.Inactif];
