/**
 * Pont labels métier ↔ enums Prisma (Devis, Facture, Livraison, Commande, Client).
 */
import type {
  ClientStatut,
  CommandeStatut,
  DevisStatut,
  FactureStatut,
  LivraisonStatut,
} from '@prisma/client';
import { normalizeCommandeStatut } from '@/lib/data/status-registry';
import type { CommandeStatut as CommandeStatutLabel } from '@/lib/data/commande-status';
import type { DevisStatut as DevisStatutLabel, LivraisonStatut as LivraisonStatutLabel } from '@/lib/data/status-registry';
import type { FactureStatutValue } from '@/lib/server/data/enum-normalize';
import {
  ACTIVE_LIVRAISON_PIPELINE,
  ACTIVE_PRODUCTION_COMMANDE_STATUTS,
  CANCELLED_COMMANDE_STATUTS,
  CLIENT,
  CMD,
  COMMANDES_SANS_DEVIS_EXCLUDED,
  COMPLETED_COMMANDE_STATUTS,
  COMPLETED_LIVRAISON,
  DEVIS,
  DEVIS_EXPIRY_WATCH,
  EXCLUDED_CLIENT_RELANCE,
  FACTURE,
  FIDELE_CLIENT_STATUTS,
  LIVRAISON,
  LOCKED_FACTURE_STATUTS,
  PENDING_DEVIS_STATUTS,
  PLANIFIER_COMMANDE_STATUTS,
  READY_TO_SHIP_LIVRAISON,
  SHIPPED_COMMANDE_STATUTS,
  UNPAID_FACTURE_STATUTS,
} from '@/lib/server/data/prisma-statut-values';

export const DEVIS_STATUT_ENUM = {
  Brouillon: 'Brouillon',
  Envoye: 'Envoyé',
  En_attente: 'En attente',
  Accepte: 'Accepté',
  Refuse: 'Refusé',
  Expire: 'Expiré',
} as const;

export type DevisStatutEnumKey = keyof typeof DEVIS_STATUT_ENUM;

export const FACTURE_STATUT_ENUM = {
  Brouillon: 'Brouillon',
  Emise: 'Émise',
  Payee: 'Payée',
  Partiellement_payee: 'Partiellement payée',
  Annulee: 'Annulée',
} as const;

export type FactureStatutEnumKey = keyof typeof FACTURE_STATUT_ENUM;

export const LIVRAISON_STATUT_ENUM = {
  Preparation: 'Préparation',
  Pret: 'Prêt',
  En_livraison: 'En livraison',
  Livre: 'Livré',
  Retour: 'Retour',
} as const;

export type LivraisonStatutEnumKey = keyof typeof LIVRAISON_STATUT_ENUM;

const DEVIS_LABEL_TO_KEY = Object.fromEntries(
  Object.entries(DEVIS_STATUT_ENUM).map(([k, v]) => [v, k]),
) as Record<string, DevisStatutEnumKey>;

const FACTURE_LABEL_TO_KEY = Object.fromEntries(
  Object.entries(FACTURE_STATUT_ENUM).map(([k, v]) => [v, k]),
) as Record<string, FactureStatutEnumKey>;

const LIVRAISON_LABEL_TO_KEY = Object.fromEntries(
  Object.entries(LIVRAISON_STATUT_ENUM).map(([k, v]) => [v, k]),
) as Record<string, LivraisonStatutEnumKey>;

export function devisStatutToLabel(key: DevisStatutEnumKey): DevisStatutLabel {
  return DEVIS_STATUT_ENUM[key] as DevisStatutLabel;
}

export function devisStatutFromLabel(label: string): DevisStatut {
  const key = DEVIS_LABEL_TO_KEY[label] ?? 'Brouillon';
  return DEVIS[key as keyof typeof DEVIS];
}

export function devisStatutLabel(statut: DevisStatut | string): string {
  if (statut in DEVIS_STATUT_ENUM) return devisStatutToLabel(statut as DevisStatutEnumKey);
  return String(statut);
}

export function factureStatutToLabel(key: FactureStatutEnumKey): FactureStatutValue {
  return FACTURE_STATUT_ENUM[key];
}

export function factureStatutFromLabel(label: string): FactureStatut {
  const key = FACTURE_LABEL_TO_KEY[label] ?? 'Brouillon';
  return FACTURE[key as keyof typeof FACTURE];
}

export function factureStatutLabel(statut: FactureStatut | string): string {
  if (statut in FACTURE_STATUT_ENUM) return factureStatutToLabel(statut as FactureStatutEnumKey);
  return String(statut);
}

export function livraisonStatutToLabel(key: LivraisonStatutEnumKey): LivraisonStatutLabel {
  return LIVRAISON_STATUT_ENUM[key] as LivraisonStatutLabel;
}

export function livraisonStatutFromLabel(label: string): LivraisonStatut {
  const key = LIVRAISON_LABEL_TO_KEY[label] ?? 'Preparation';
  return LIVRAISON[key as keyof typeof LIVRAISON];
}

export function livraisonStatutLabel(statut: LivraisonStatut | string): string {
  if (statut in LIVRAISON_STATUT_ENUM) return livraisonStatutToLabel(statut as LivraisonStatutEnumKey);
  return String(statut);
}

export function serializeDevisForApi<T extends { statut: DevisStatut | string }>(row: T): T {
  return { ...row, statut: devisStatutLabel(row.statut) as T['statut'] };
}

export function serializeFactureForApi<T extends { statut: FactureStatut | string }>(row: T): T {
  return { ...row, statut: factureStatutLabel(row.statut) as T['statut'] };
}

export function serializeLivraisonForApi<T extends { statut: LivraisonStatut | string }>(row: T): T {
  return { ...row, statut: livraisonStatutLabel(row.statut) as T['statut'] };
}

export function unpaidFactureStatuts(): FactureStatut[] {
  return [...UNPAID_FACTURE_STATUTS];
}

export function pendingDevisStatuts(): DevisStatut[] {
  return [...PENDING_DEVIS_STATUTS];
}

export function lockedFactureStatuts(): FactureStatut[] {
  return [...LOCKED_FACTURE_STATUTS];
}

export function activeLivraisonPipelineStatuts(): LivraisonStatut[] {
  return [...ACTIVE_LIVRAISON_PIPELINE];
}

export function readyToShipLivraisonStatuts(): LivraisonStatut[] {
  return [...READY_TO_SHIP_LIVRAISON];
}

export function completedLivraisonStatuts(): LivraisonStatut[] {
  return [...COMPLETED_LIVRAISON];
}

export function devisExpiryWatchStatuts(): DevisStatut[] {
  return [...DEVIS_EXPIRY_WATCH];
}

export function isUnpaidFactureStatut(statut: FactureStatut): boolean {
  return unpaidFactureStatuts().includes(statut);
}

export function isPendingDevisStatut(statut: DevisStatut): boolean {
  return pendingDevisStatuts().includes(statut);
}

export const COMMANDE_STATUT_ENUM = {
  A_planifier: 'À planifier',
  En_attente_stock: 'En attente stock',
  En_production: 'En production',
  En_finition: 'En finition',
  Prete: 'Prête',
  Livre: 'Livré',
  Suspendu: 'Suspendu',
  Annulee: 'Annulée',
  Livree: 'Livrée',
  Terminee: 'Terminée',
  En_retard: 'En retard',
} as const;

export type CommandeStatutEnumKey = keyof typeof COMMANDE_STATUT_ENUM;

const COMMANDE_LABEL_TO_KEY = Object.fromEntries(
  Object.entries(COMMANDE_STATUT_ENUM).map(([k, v]) => [v, k]),
) as Record<string, CommandeStatutEnumKey>;

export function commandeStatutToLabel(key: CommandeStatutEnumKey): CommandeStatutLabel {
  return COMMANDE_STATUT_ENUM[key] as CommandeStatutLabel;
}

export function commandeStatutFromLabel(label: string): CommandeStatut {
  const normalized = normalizeCommandeStatut(label);
  const key = COMMANDE_LABEL_TO_KEY[normalized] ?? COMMANDE_LABEL_TO_KEY[label] ?? 'A_planifier';
  return CMD[key as keyof typeof CMD];
}

export function commandeStatutLabel(statut: CommandeStatut | string): string {
  if (statut in COMMANDE_STATUT_ENUM) return commandeStatutToLabel(statut as CommandeStatutEnumKey);
  return String(statut);
}

export function serializeCommandeForApi<T extends { statut: CommandeStatut | string }>(row: T): T {
  const label = normalizeCommandeStatut(commandeStatutLabel(row.statut));
  return { ...row, statut: label as T['statut'] };
}

export function completedCommandeStatuts(): CommandeStatut[] {
  return [...COMPLETED_COMMANDE_STATUTS];
}

export function planifierCommandeStatuts(): CommandeStatut[] {
  return [...PLANIFIER_COMMANDE_STATUTS];
}

export function activeProductionCommandeStatuts(): CommandeStatut[] {
  return [...ACTIVE_PRODUCTION_COMMANDE_STATUTS];
}

export function shippedCommandeStatuts(): CommandeStatut[] {
  return [...SHIPPED_COMMANDE_STATUTS];
}

export function commandeRetardStatut(): CommandeStatut {
  return CMD.En_retard;
}

export function annuleeCommandeStatut(): CommandeStatut {
  return CMD.Annulee;
}

export function cancelledCommandeStatuts(): CommandeStatut[] {
  return [...CANCELLED_COMMANDE_STATUTS];
}

export function commandesSansDevisExcludedStatuts(): CommandeStatut[] {
  return [...COMMANDES_SANS_DEVIS_EXCLUDED];
}

export function acceptedDevisStatut(): DevisStatut {
  return DEVIS.Accepte;
}

export function brouillonDevisStatut(): DevisStatut {
  return DEVIS.Brouillon;
}

export function refuseDevisStatut(): DevisStatut {
  return DEVIS.Refuse;
}

export function inactifClientStatut(): ClientStatut {
  return CLIENT.Inactif;
}

export function materialPlanCommandeStatutLabel(statut: CommandeStatut): string {
  if (statut === CMD.En_production) return 'En prod.';
  if (statut === CMD.Prete || statut === CMD.Terminee) return 'Terminé';
  return 'À planifier';
}

export function commandeStatutsFromLabels(labels: string[]): CommandeStatut[] {
  return labels.map(commandeStatutFromLabel);
}

export const CLIENT_STATUT_ENUM = {
  Actif: 'Actif',
  Premium: 'Premium',
  VIP: 'VIP',
  Inactif: 'Inactif',
  Archive: 'Archivé',
  Prospect: 'Prospect',
} as const;

export type ClientStatutEnumKey = keyof typeof CLIENT_STATUT_ENUM;

const CLIENT_LABEL_TO_KEY = Object.fromEntries(
  Object.entries(CLIENT_STATUT_ENUM).map(([k, v]) => [v, k]),
) as Record<string, ClientStatutEnumKey>;

export function clientStatutToLabel(key: ClientStatutEnumKey): string {
  return CLIENT_STATUT_ENUM[key];
}

export function clientStatutFromLabel(label: string): ClientStatut {
  const key = CLIENT_LABEL_TO_KEY[label] ?? (label in CLIENT_STATUT_ENUM ? label : 'Actif');
  return CLIENT[key as keyof typeof CLIENT];
}

export function clientStatutLabel(statut: ClientStatut | string): string {
  if (statut in CLIENT_STATUT_ENUM) return clientStatutToLabel(statut as ClientStatutEnumKey);
  return String(statut);
}

export function serializeClientForApi<T extends { statut: ClientStatut | string }>(row: T): T {
  return { ...row, statut: clientStatutLabel(row.statut) as T['statut'] };
}

export function clientStatutFromCategorie(categorie: string): ClientStatut {
  if (categorie === 'VIP') return CLIENT.VIP;
  if (categorie === 'Prospect') return CLIENT.Prospect;
  return CLIENT.Actif;
}

export function fideleClientStatuts(): ClientStatut[] {
  return [...FIDELE_CLIENT_STATUTS];
}

export function excludedClientStatutsForRelance(): ClientStatut[] {
  return [...EXCLUDED_CLIENT_RELANCE];
}

export function prospectClientStatut(): ClientStatut {
  return CLIENT.Prospect;
}

export function activeClientStatut(): ClientStatut {
  return CLIENT.Actif;
}

export function archivedClientStatut(): ClientStatut {
  return CLIENT.Archive;
}

export function premiumClientStatut(): ClientStatut {
  return CLIENT.Premium;
}
