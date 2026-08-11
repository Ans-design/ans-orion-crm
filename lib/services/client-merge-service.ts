import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { PRISMA_TX_OPTIONS } from '@/lib/prisma-transaction';
import { ClientStatut } from '@prisma/client';

function mergeNotes(targetNotes: string | null, sourceNotes: string | null, sourceCode: string) {
  const parts = [targetNotes?.trim(), sourceNotes?.trim() ? `[Fusion ${sourceCode}] ${sourceNotes.trim()}` : null]
    .filter(Boolean);
  return parts.length ? parts.join('\n\n') : null;
}

/** Fusionne source → cible sans suppression destructive (source archivée). */
export async function mergeClients(
  sourceId: string,
  targetId: string,
  opts?: { userId?: string; userName?: string },
) {
  if (sourceId === targetId) {
    return { ok: false as const, error: 'Source et cible identiques' };
  }

  const [source, target] = await Promise.all([
    prisma.client.findUnique({ where: { id: sourceId } }),
    prisma.client.findUnique({ where: { id: targetId } }),
  ]);

  if (!source || !target) {
    return { ok: false as const, error: 'Client introuvable' };
  }
  if (source.archived) {
    return { ok: false as const, error: 'Le client source est déjà archivé' };
  }

  const moved = await prisma.$transaction(async (tx) => {
    const counts = {
      devis: (await tx.devis.updateMany({ where: { clientId: sourceId }, data: { clientId: targetId } })).count,
      commandes: (await tx.commande.updateMany({ where: { clientId: sourceId }, data: { clientId: targetId } })).count,
      factures: (await tx.facture.updateMany({ where: { clientId: sourceId }, data: { clientId: targetId } })).count,
      paiements: (await tx.paiement.updateMany({ where: { clientId: sourceId }, data: { clientId: targetId } })).count,
      livraisons: (await tx.livraison.updateMany({ where: { clientId: sourceId }, data: { clientId: targetId } })).count,
      files: (await tx.fileAsset.updateMany({ where: { clientId: sourceId }, data: { clientId: targetId } })).count,
      proofs: (await tx.proof.updateMany({ where: { clientId: sourceId }, data: { clientId: targetId } })).count,
      reclamations: (await tx.clientReclamation.updateMany({ where: { clientId: sourceId }, data: { clientId: targetId } })).count,
      studioBriefs: (await tx.studioBrief.updateMany({ where: { clientId: sourceId }, data: { clientId: targetId } })).count,
      cmCampaigns: (await tx.cmCampaign.updateMany({ where: { clientId: sourceId }, data: { clientId: targetId } })).count,
      cmRelances: (await tx.cmRelance.updateMany({ where: { clientId: sourceId }, data: { clientId: targetId } })).count,
      notificationLogs: (await tx.clientNotificationLog.updateMany({ where: { clientId: sourceId }, data: { clientId: targetId } })).count,
      stockDirectSales: (await tx.stockDirectSale.updateMany({ where: { clientId: sourceId }, data: { clientId: targetId } })).count,
    };

    await tx.client.update({
      where: { id: targetId },
      data: {
        cmds: { increment: source.cmds },
        notes: mergeNotes(target.notes, source.notes, source.code),
        tel: target.tel || source.tel,
        whatsapp: target.whatsapp || source.whatsapp,
        email: target.email || source.email,
        adresse: target.adresse || source.adresse,
        ville: target.ville || source.ville,
        nif: target.nif || source.nif,
        statNumber: target.statNumber || source.statNumber,
      },
    });

    await tx.client.update({
      where: { id: sourceId },
      data: {
        archived: true,
        archivedAt: new Date(),
        statut: ClientStatut.Archive,
        notes: `Fusionné vers ${target.code} — ${target.name} (${new Date().toLocaleDateString('fr-FR')})`,
      },
    });

    return counts;
  }, PRISMA_TX_OPTIONS);

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'MERGE',
    entity: 'Client',
    entityId: targetId,
    entityLabel: `${source.code} → ${target.code}`,
    details: { sourceId, targetId, moved },
  });

  return {
    ok: true as const,
    target: { id: target.id, code: target.code, name: target.name },
    source: { id: source.id, code: source.code },
    moved,
  };
}
