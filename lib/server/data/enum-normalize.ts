import {
  DEVIS_STATUTS,
  FACTURE_UNPAID_STATUTS,
  LIVRAISON_STATUTS,
  PAIEMENT_TYPES,
  type DevisStatut,
  type LivraisonStatut,
} from '@/lib/data/status-registry';

export const PAIEMENT_TYPE_VALUES = PAIEMENT_TYPES;
export type PaiementTypeValue = (typeof PAIEMENT_TYPES)[number];

export function normalizePaiementType(raw: string | null | undefined): PaiementTypeValue {
  const s = (raw ?? '').trim();
  if (s === 'Acompte' || s === 'Solde' || s === 'Remboursement') return s;
  return 'Acompte';
}

export function isPaiementType(raw: string): raw is PaiementTypeValue {
  return (PAIEMENT_TYPES as readonly string[]).includes(raw);
}

export type FactureStatutValue =
  | 'Brouillon'
  | 'Émise'
  | 'Payée'
  | 'Partiellement payée'
  | 'Annulée';

export const FACTURE_STATUTS: FactureStatutValue[] = [
  'Brouillon',
  'Émise',
  'Payée',
  'Partiellement payée',
  'Annulée',
];

export function normalizeDevisStatut(raw: string | null | undefined): DevisStatut {
  const s = (raw ?? '').trim();
  if ((DEVIS_STATUTS as readonly string[]).includes(s)) return s as DevisStatut;
  return 'Brouillon';
}

export function normalizeLivraisonStatut(raw: string | null | undefined): LivraisonStatut {
  const s = (raw ?? '').trim();
  if ((LIVRAISON_STATUTS as readonly string[]).includes(s)) return s as LivraisonStatut;
  return 'Préparation';
}

export function normalizeFactureStatut(raw: string | null | undefined): FactureStatutValue {
  const s = (raw ?? '').trim();
  if ((FACTURE_STATUTS as readonly string[]).includes(s)) return s as FactureStatutValue;
  return 'Brouillon';
}

export function isFactureUnpaid(statut: string): boolean {
  return (FACTURE_UNPAID_STATUTS as readonly string[]).includes(statut);
}
