import { prisma } from '@/lib/prisma';
import { postOrionAssistantMessage } from '@/lib/orion/orion-assistant';
import { excludedClientStatutsForRelance } from '@/lib/server/data/prisma-statut-bridge';

const INACTIVE_DAYS = 60;

/** Clients sans commande depuis 2 mois — relance commerciale (§26). */
export async function listInactiveClientsForRelance(limit = 20) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - INACTIVE_DAYS);

  const clients = await prisma.client.findMany({
    where: { archived: false, statut: { notIn: excludedClientStatutsForRelance() } },
    select: {
      id: true,
      code: true,
      name: true,
      ville: true,
      email: true,
      tel: true,
      relanceAt: true,
      commandes: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true, numero: true },
      },
    },
    take: 200,
  });

  type InactiveClient = {
    id: string;
    code: string;
    name: string;
    ville: string | null;
    email: string | null;
    tel: string | null;
    relanceAt: Date | null;
    lastCommandeNumero: string | null;
    lastActivity: Date;
    daysSince: number;
  };

  const inactive: InactiveClient[] = [];
  for (const c of clients) {
    const lastCmd = c.commandes[0]?.createdAt ?? null;
    if (!lastCmd || lastCmd >= cutoff) continue;
    const daysSince = Math.floor((Date.now() - lastCmd.getTime()) / (24 * 60 * 60 * 1000));
    inactive.push({
      id: c.id,
      code: c.code,
      name: c.name,
      ville: c.ville,
      email: c.email,
      tel: c.tel,
      relanceAt: c.relanceAt,
      lastCommandeNumero: c.commandes[0]?.numero ?? null,
      lastActivity: lastCmd,
      daysSince,
    });
  }

  return inactive.sort((a, b) => b.daysSince - a.daysSince).slice(0, limit);
}

export async function notifyInactiveClientAlerts() {
  const list = await listInactiveClientsForRelance(10);
  for (const c of list) {
    await postOrionAssistantMessage({
      type: 'client_inactif',
      title: 'Client inactif 2 mois',
      body: `${c.name} — dernière commande il y a ${c.daysSince} jours.`,
      link: `/clients?id=${c.id}`,
      dedupKey: `client-inactif:${c.id}`,
    });
  }
  return { count: list.length, clients: list };
}
