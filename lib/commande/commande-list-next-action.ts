import type { NextAction } from '@/lib/flow/next-action';
import { resolveCommandeNextAction } from '@/lib/commande/order-next-action';

type CommandeListRow = {
  id: string;
  statut: string;
  reste: number;
  total: number;
  _count?: {
    factures?: number;
    livraisons?: number;
    productionDossiers?: number;
    proofs?: number;
  };
  proofs?: { statut: string }[];
  factures?: { id: string }[];
  livraisons?: { id: string }[];
  productionDossiers?: { id: string }[];
};

/** Action suivante légère pour la liste commandes (sans charger le dossier complet). */
export function resolveCommandeListNextAction(row: CommandeListRow): NextAction | null {
  const hasBatPending = row.proofs
    ? row.proofs.some((p) => !['Validé', 'Verrouillé', 'Refusé'].includes(p.statut))
    : false;

  return resolveCommandeNextAction({
    commandeId: row.id,
    statut: row.statut,
    reste: row.reste,
    total: row.total,
    hasFacture: (row._count?.factures ?? row.factures?.length ?? 0) > 0,
    hasLivraison: (row._count?.livraisons ?? row.livraisons?.length ?? 0) > 0,
    hasDossierGpaO: (row._count?.productionDossiers ?? row.productionDossiers?.length ?? 0) > 0,
    hasBatPending,
    blocagesActifs: 0,
    factureId: row.factures?.[0]?.id ?? null,
    dossierId: row.productionDossiers?.[0]?.id ?? null,
    livraisonId: row.livraisons?.[0]?.id ?? null,
  });
}
