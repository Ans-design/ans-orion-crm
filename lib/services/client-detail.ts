type TimelineItem = {
  id: string;
  type: 'devis' | 'commande' | 'facture' | 'paiement';
  label: string;
  sublabel?: string;
  statut?: string;
  montant?: number;
  date: Date;
};

function paymentNet(montant: number, type: string) {
  return type === 'Remboursement' ? -montant : montant;
}

/** Solde restant dû — factures impayées prioritaires, sinon reste commandes */
export function computeClientSolde(client: {
  commandes: { reste: number }[];
  factures: { statut: string; totalTTC: number; paiements: { montant: number; type: string }[] }[];
}): number {
  const resteCommandes = client.commandes.reduce((s, c) => s + (c.reste || 0), 0);
  const resteFactures = client.factures
    .filter((f) => f.statut === 'Émise' || f.statut === 'Partiellement payée')
    .reduce((s, f) => {
      const paid = f.paiements.reduce((ps, p) => ps + paymentNet(p.montant, p.type), 0);
      return s + Math.max(0, f.totalTTC - paid);
    }, 0);
  return resteFactures > 0 ? resteFactures : resteCommandes;
}

/** Map categorie CRM → statut affiché */
export { clientStatutFromCategorie as statutFromCategorie } from '@/lib/server/data/prisma-statut-bridge';

export function buildClientDetail(client: {
  id: string;
  devis: { id: string; numero: string; statut: string; totalTTC: number; createdAt: Date }[];
  commandes: { id: string; numero: string; statut: string; total: number; reste: number; article: string; createdAt: Date }[];
  factures: { id: string; numero: string; statut: string; totalTTC: number; createdAt: Date; paiements: { montant: number; type: string }[] }[];
  paiements: { id: string; numero: string; montant: number; type: string; mode: string; datePaiement: Date }[];
}) {
  const totalFacture = client.factures.reduce((s, f) => s + f.totalTTC, 0);
  const totalPayeFactures = client.factures.reduce(
    (s, f) => s + f.paiements.reduce((ps, p) => ps + paymentNet(p.montant, p.type), 0),
    0,
  );
  const totalPayeDirect = client.paiements.reduce((s, p) => s + paymentNet(p.montant, p.type), 0);
  const totalPaye = Math.max(totalPayeFactures, totalPayeDirect);
  const solde = computeClientSolde(client);

  const timeline: TimelineItem[] = [
    ...client.devis.map((d) => ({
      id: d.id,
      type: 'devis' as const,
      label: d.numero,
      sublabel: 'Devis',
      statut: d.statut,
      montant: d.totalTTC,
      date: d.createdAt,
    })),
    ...client.commandes.map((c) => ({
      id: c.id,
      type: 'commande' as const,
      label: c.numero,
      sublabel: c.article,
      statut: c.statut,
      montant: c.total,
      date: c.createdAt,
    })),
    ...client.factures.map((f) => ({
      id: f.id,
      type: 'facture' as const,
      label: f.numero,
      sublabel: 'Facture',
      statut: f.statut,
      montant: f.totalTTC,
      date: f.createdAt,
    })),
    ...client.paiements.map((p) => ({
      id: p.id,
      type: 'paiement' as const,
      label: p.numero,
      sublabel: p.mode,
      statut: p.type,
      montant: paymentNet(p.montant, p.type),
      date: p.datePaiement,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    summary: {
      totalFacture,
      totalPaye,
      solde,
      devisCount: client.devis.length,
      commandesCount: client.commandes.length,
      facturesCount: client.factures.length,
      paiementsCount: client.paiements.length,
    },
    timeline: timeline.slice(0, 30),
  };
}
