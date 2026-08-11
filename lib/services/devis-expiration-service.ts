import { prisma } from '@/lib/prisma';
import { DevisStatut } from '@prisma/client';
import { daysUntilDevisExpiry, isDevisExpired } from '@/lib/devis/devis-validity';
import { pendingDevisStatuts } from '@/lib/server/data/prisma-statut-bridge';
import { postOrionAssistantMessage } from '@/lib/orion/orion-assistant';

/** Passe en « Expiré » les devis dont validUntil est dépassé (historique conservé). */
export async function expireOverdueDevis() {
  const now = new Date();
  const overdue = await prisma.devis.findMany({
    where: {
      validUntil: { lt: now },
      statut: { in: pendingDevisStatuts() },
    },
    select: { id: true, numero: true, clientId: true },
  });

  if (overdue.length === 0) return { expired: 0 };

  await prisma.devis.updateMany({
    where: { id: { in: overdue.map((d) => d.id) } },
    data: { statut: DevisStatut.Expire },
  });

  for (const d of overdue) {
    await postOrionAssistantMessage({
      type: 'devis_expire',
      title: 'Devis expiré',
      body: `${d.numero} — validité 2 mois dépassée`,
      link: `/devis?id=${d.id}`,
      dedupKey: `devis-expired:${d.id}`,
    });
  }

  return { expired: overdue.length };
}

/** Alertes J-15, J-7, J-1 avant expiration (dédup 24h). */
export async function notifyDevisExpirationWarnings() {
  const candidates = await prisma.devis.findMany({
    where: {
      statut: { in: [DevisStatut.Envoye, DevisStatut.En_attente] },
      validUntil: { not: null },
    },
    select: { id: true, numero: true, validUntil: true, client: { select: { name: true } } },
  });

  let notified = 0;
  for (const d of candidates) {
    const days = daysUntilDevisExpiry(d.validUntil);
    if (days === null || days < 0) continue;
    const bucket = days <= 1 ? 'J-1' : days <= 7 ? 'J-7' : days <= 15 ? 'J-15' : null;
    if (!bucket) continue;

    await postOrionAssistantMessage({
      type: 'devis_expiration',
      title: `Devis ${bucket}`,
      body: `${d.numero} expire dans ${days} jour(s) — ${d.client?.name ?? 'Client'}`,
      link: `/devis?id=${d.id}`,
      dedupKey: `devis-warn:${d.id}:${bucket}`,
    });
    notified += 1;
  }
  return { notified };
}

export function assertDevisAcceptable(devis: { validUntil?: Date | null; statut: DevisStatut | string }) {
  if (isDevisExpired(devis)) {
    return { ok: false as const, message: 'Devis expiré — dupliquez ou prolongez la validité avant conversion' };
  }
  if (devis.statut === DevisStatut.Refuse || devis.statut === 'Refusé') {
    return { ok: false as const, message: 'Devis refusé' };
  }
  return { ok: true as const };
}
