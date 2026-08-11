import { prisma } from '@/lib/prisma';
import { FactureStatut } from '@prisma/client';
import {
  isUnpaidFactureStatut,
  unpaidFactureStatuts,
} from '@/lib/server/data/prisma-statut-bridge';

function paidTotal(paiements: { montant: number; type: string }[]) {
  return paiements.reduce((s, p) => s + (p.type === 'Remboursement' ? -p.montant : p.montant), 0);
}

export type FactureListStats = {
  count: number;
  totalFacture: number;
  totalPayee: number;
  totalCreances: number;
  countImpayees: number;
  countOverdue: number;
};

/** Agrégats globaux factures (KPIs liste — indépendants de la pagination). */
export async function getFactureListStats(): Promise<FactureListStats> {
  const now = new Date();
  const factures = await prisma.facture.findMany({
    where: { statut: { not: FactureStatut.Annulee } },
    select: {
      statut: true,
      totalTTC: true,
      dateEcheance: true,
      paiements: { select: { montant: true, type: true } },
    },
  });

  let totalFacture = 0;
  let totalPayee = 0;
  let totalCreances = 0;
  let countImpayees = 0;
  let countOverdue = 0;

  for (const f of factures) {
    totalFacture += f.totalTTC;
    const paid = paidTotal(f.paiements);
    if (f.statut === FactureStatut.Payee) {
      totalPayee += f.totalTTC;
    } else if (isUnpaidFactureStatut(f.statut)) {
      const reste = Math.max(0, f.totalTTC - paid);
      totalCreances += reste;
      countImpayees += 1;
      if (f.dateEcheance && f.dateEcheance < now) countOverdue += 1;
    }
  }

  return {
    count: factures.length,
    totalFacture,
    totalPayee,
    totalCreances,
    countImpayees,
    countOverdue,
  };
}
