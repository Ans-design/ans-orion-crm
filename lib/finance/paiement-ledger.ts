/**
 * Ledger paiements — règles centralisées (source de vérité des encaissements).
 *
 * Acompte commande = somme des paiements ledger-admissibles (validés)
 *                  − remboursements valides.
 * Commande.acompte / reste = projections dérivées (jamais source).
 */

import { addMga, roundMga, soldeMga, subMga } from '@/lib/money/mga';

/** Statuts métier — alignés Prisma `PaiementStatut`. */
export const PAIEMENT_STATUTS = [
  'Initie',
  'En_attente',
  'Valide',
  'Rejete',
  'Annule',
  'Rembourse_partiel',
  'Rembourse_total',
] as const;

export type PaiementStatutCode = (typeof PAIEMENT_STATUTS)[number];

/** Compte dans l’acompte / solde (encaissement net). */
export const LEDGER_COUNTABLE_STATUTS: ReadonlySet<PaiementStatutCode> = new Set([
  'Valide',
  'Rembourse_partiel',
]);

/** Ne compte pas (historique conservé). */
export const LEDGER_EXCLUDED_STATUTS: ReadonlySet<PaiementStatutCode> = new Set([
  'Initie',
  'En_attente',
  'Rejete',
  'Annule',
  'Rembourse_total', // le paiement d’origine est déjà neutralisé / remplacé
]);

export function normalizePaiementStatut(raw: string | null | undefined): PaiementStatutCode {
  const s = String(raw ?? 'Valide').trim();
  if ((PAIEMENT_STATUTS as readonly string[]).includes(s)) return s as PaiementStatutCode;
  // Legacy / imports sans statut → considéré validé (rétrocompat)
  return 'Valide';
}

export function isLedgerCountableStatut(statut: string | null | undefined): boolean {
  return LEDGER_COUNTABLE_STATUTS.has(normalizePaiementStatut(statut));
}

export type LedgerPaymentRow = {
  montant: number;
  type?: string | null;
  statut?: string | null;
};

/**
 * Total encaissé net depuis le ledger.
 * - Types Acompte/Solde (et autres non-remboursement) : +montant si statut comptable
 * - Type Remboursement : −montant si statut Valide / Rembourse_partiel
 * - Annulé / rejeté / initié / en attente : ignorés
 */
export function computeLedgerPaidTotal(paiements: LedgerPaymentRow[]): number {
  return paiements.reduce((sum, p) => {
    if (!isLedgerCountableStatut(p.statut)) return sum;
    const m = roundMga(p.montant);
    if (m < 0) return sum; // montants négatifs interdits sans règle explicite
    return p.type === 'Remboursement' ? subMga(sum, m) : addMga(sum, m);
  }, 0);
}

/** Solde dû (jamais négatif). */
export function computeLedgerReste(commandeTotal: number, paiements: LedgerPaymentRow[]): number {
  return soldeMga(commandeTotal, computeLedgerPaidTotal(paiements));
}

/** Trop-perçu si encaissements nets > total. */
export function computeLedgerTropPercu(commandeTotal: number, paiements: LedgerPaymentRow[]): number {
  const paid = computeLedgerPaidTotal(paiements);
  return Math.max(0, subMga(paid, roundMga(commandeTotal)));
}

export function assertNonNegativeMoney(amount: number, field: string): void {
  if (roundMga(amount) < 0) {
    throw new Error(`NEGATIVE_FORBIDDEN:${field}`);
  }
}

/** Transitions d’annulation — historique conservé (statut Annule, pas delete). */
export function canCancelPaiement(statut: string | null | undefined): boolean {
  const s = normalizePaiementStatut(statut);
  return s === 'Initie' || s === 'En_attente' || s === 'Valide';
}

export function canValidatePaiement(statut: string | null | undefined): boolean {
  const s = normalizePaiementStatut(statut);
  return s === 'Initie' || s === 'En_attente';
}
