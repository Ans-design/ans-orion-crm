import { prisma } from '@/lib/prisma';
import { ClientStatut } from '@prisma/client';
import { containsQ } from '@/lib/prisma-filters';

export type GlobalSearchResult = {
  type: string;
  id: string;
  label: string;
  sub: string;
  href: string;
};

/** Recherche globale multi-entités (clients, devis, commandes, etc.). */
export async function runGlobalSearch(q: string): Promise<GlobalSearchResult[]> {
  const [
    clients,
    prospects,
    devis,
    commandes,
    factures,
    paiements,
    livraisons,
    employes,
    tickets,
    reclamations,
  ] = await Promise.all([
    prisma.client.findMany({
      where: {
        archived: false,
        statut: { not: ClientStatut.Prospect },
        OR: [
          { name: containsQ(q) },
          { email: containsQ(q) },
          { code: containsQ(q) },
          { tel: containsQ(q) },
        ],
      },
      take: 5,
      select: { id: true, name: true, code: true },
    }),
    prisma.client.findMany({
      where: {
        archived: false,
        statut: ClientStatut.Prospect,
        OR: [{ name: containsQ(q) }, { code: containsQ(q) }, { email: containsQ(q) }],
      },
      take: 4,
      select: { id: true, name: true, code: true },
    }),
    prisma.devis.findMany({
      where: { OR: [{ numero: containsQ(q) }, { client: { name: containsQ(q) } }] },
      take: 5,
      select: { id: true, numero: true, statut: true, client: { select: { name: true } } },
    }),
    prisma.commande.findMany({
      where: {
        OR: [
          { numero: containsQ(q) },
          { article: containsQ(q) },
          { client: { name: containsQ(q) } },
        ],
      },
      take: 5,
      select: { id: true, numero: true, statut: true, article: true },
    }),
    prisma.facture.findMany({
      where: { OR: [{ numero: containsQ(q) }, { client: { name: containsQ(q) } }] },
      take: 5,
      select: { id: true, numero: true, statut: true },
    }),
    prisma.paiement.findMany({
      where: { OR: [{ numero: containsQ(q) }, { reference: containsQ(q) }] },
      take: 5,
      select: { id: true, numero: true, montant: true },
    }),
    prisma.livraison.findMany({
      where: { OR: [{ numero: containsQ(q) }, { commande: { numero: containsQ(q) } }] },
      take: 5,
      select: { id: true, numero: true, statut: true },
    }),
    prisma.employee.findMany({
      where: {
        OR: [
          { matricule: containsQ(q) },
          { firstName: containsQ(q) },
          { lastName: containsQ(q) },
          { email: containsQ(q) },
        ],
      },
      take: 4,
      select: { id: true, matricule: true, firstName: true, lastName: true },
    }),
    prisma.maintenanceTicket.findMany({
      where: { OR: [{ numero: containsQ(q) }, { titre: containsQ(q) }] },
      take: 4,
      select: { id: true, numero: true, titre: true, statut: true },
    }),
    prisma.clientReclamation.findMany({
      where: { OR: [{ subject: containsQ(q) }, { client: { name: containsQ(q) } }] },
      take: 4,
      include: { client: { select: { name: true } } },
    }),
  ]);

  return [
    ...clients.map((c) => ({ type: 'client', id: c.id, label: c.name, sub: c.code, href: `/clients/${c.id}` })),
    ...prospects.map((c) => ({ type: 'prospect', id: c.id, label: c.name, sub: `Prospect · ${c.code}`, href: `/clients/${c.id}` })),
    ...devis.map((d) => ({ type: 'devis', id: d.id, label: d.numero, sub: d.client?.name || d.statut, href: `/devis` })),
    ...commandes.map((c) => ({ type: 'commande', id: c.id, label: c.numero, sub: c.article, href: `/commandes/${c.id}` })),
    ...factures.map((f) => ({ type: 'facture', id: f.id, label: f.numero, sub: f.statut, href: `/factures` })),
    ...paiements.map((p) => ({ type: 'paiement', id: p.id, label: p.numero, sub: `${p.montant} Ar`, href: `/paiements` })),
    ...livraisons.map((l) => ({ type: 'livraison', id: l.id, label: l.numero, sub: l.statut, href: `/livraisons` })),
    ...employes.map((e) => ({
      type: 'employé',
      id: e.id,
      label: `${e.firstName} ${e.lastName}`,
      sub: e.matricule,
      href: `/rh/employes`,
    })),
    ...tickets.map((t) => ({
      type: 'ticket',
      id: t.id,
      label: t.numero,
      sub: t.titre,
      href: `/maintenance/tickets`,
    })),
    ...reclamations.map((r) => ({
      type: 'réclamation',
      id: r.id,
      label: r.subject,
      sub: r.client?.name ?? r.statut,
      href: `/reclamations`,
    })),
  ];
}
