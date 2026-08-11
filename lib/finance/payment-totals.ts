import { FactureStatut } from '@prisma/client';
import { roundMga } from '@/lib/money/mga';
import {
  computeLedgerPaidTotal,
  type LedgerPaymentRow,
} from '@/lib/finance/paiement-ledger';

/**
 * Total encaissé net (remboursements soustraits) — ariary entiers.
 * Respecte les statuts ledger (Annule / Rejete / Initie exclus).
 * Rétrocompat : sans `statut` → traité comme Valide.
 */
export function computePaidTotal(
  paiements: Array<{ montant: number; type?: string | null; statut?: string | null }>,
): number {
  return computeLedgerPaidTotal(paiements as LedgerPaymentRow[]);
}

/** Statut facture après encaissement direct sur facture. */
export function resolveFactureStatutFromPayments(
  totalPaye: number,
  totalTTC: number,
  currentStatut: FactureStatut,
): FactureStatut | null {
  if (currentStatut === FactureStatut.Annulee) return null;

  let newStatut = currentStatut;
  if (totalPaye >= totalTTC) {
    newStatut = FactureStatut.Payee;
  } else if (totalPaye > 0 && currentStatut !== FactureStatut.Brouillon) {
    newStatut = FactureStatut.Partiellement_payee;
  } else if (totalPaye > 0 && currentStatut === FactureStatut.Brouillon) {
    newStatut = FactureStatut.Partiellement_payee;
  }

  return newStatut === currentStatut ? null : newStatut;
}

/** Statut facture liée à une commande après paiement commandeId (ou facture). */
export function resolveCommandeLinkedFactureStatut(
  totalPaye: number,
  factureTotalTTC: number,
  commandeTotal: number,
  currentStatut: FactureStatut,
): FactureStatut | null {
  if (currentStatut === FactureStatut.Annulee) return null;

  let newStatut = currentStatut;
  if (totalPaye >= factureTotalTTC || totalPaye >= commandeTotal) {
    newStatut = FactureStatut.Payee;
  } else if (totalPaye > 0) {
    newStatut = FactureStatut.Partiellement_payee;
  }

  return newStatut === currentStatut ? null : newStatut;
}

export function paidTotalRounded(amount: number): number {
  return roundMga(amount);
}
