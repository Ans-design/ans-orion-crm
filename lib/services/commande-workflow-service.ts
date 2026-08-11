import { prisma } from '@/lib/prisma';
import { CommandeStatut as CommandeStatutEnum } from '@prisma/client';
import { logAuditChange } from '@/lib/audit';
import { commandeStatutFromLabel, commandeStatutLabel } from '@/lib/server/data/prisma-statut-bridge';
import { afterCommandeCreated } from '@/lib/services/cart-service';
import { ensureFactureForCommande } from '@/lib/services/facture-workflow-service';
import {
  buildCommandeWorkflowSnapshot,
  findJalonById,
  getAvancementForStatut,
  validateCommandeStatutTransition,
  validateJalonAdvance,
  type CommandeWorkflowContext,
  type CommandeWorkflowSnapshot,
} from '@/lib/workflow/commande-workflow';
import type { CommandeStatut } from '@/lib/data/commande-status';
import { normalizeCommandeStatut } from '@/lib/data/status-registry';
import { assessCommandeStock } from '@/lib/services/commande-stock-workflow';
import { isQualiteStatutValide } from '@/lib/qualite/qualite-validated';
import { getCommandeTransitionMap } from '@/lib/services/workflow-transition-service';
import { applyProductionFluxOnCommandeTransition } from '@/lib/services/production-flux-service';
import { getAcompteRatioFromDevisNotes } from '@/lib/devis/acompte-threshold';
import { isBatValidated } from '@/lib/constants/file-assets';
import {
  commandeRemainingAmount,
  findCommandeRelatedPaiements,
  paidTotal,
} from '@/lib/server/modules/paiements/paiements.repository';

/** Corrige les statuts legacy en base (Livrée, Terminée…). Ne touche pas En_retard. */
export async function migrateLegacyCommandeStatut(commandeId: string): Promise<void> {
  const cmd = await prisma.commande.findUnique({
    where: { id: commandeId },
    select: { statut: true },
  });
  if (!cmd) return;
  // En_retard est un statut Prisma valide — ne jamais le réécrire en À_planifier
  if (cmd.statut === CommandeStatutEnum.En_retard) return;

  const label = commandeStatutLabel(cmd.statut);
  const normalized = normalizeCommandeStatut(label);
  const enumVal = commandeStatutFromLabel(normalized);
  if (enumVal !== cmd.statut) {
    await prisma.commande.update({
      where: { id: commandeId },
      data: { statut: enumVal },
    });
  }
}

export async function loadCommandeWorkflowContext(commandeId: string): Promise<CommandeWorkflowContext | null> {
  await migrateLegacyCommandeStatut(commandeId);

  const commande = await prisma.commande.findUnique({
    where: { id: commandeId },
    select: {
      statut: true,
      avancement: true,
      total: true,
      acompte: true,
      reste: true,
      devis: { select: { notes: true } },
      proofs: { select: { statut: true } },
      productionDossiers: {
        select: {
          id: true,
          etapes: { where: { nom: 'Contrôle qualité' }, select: { statut: true } },
          incidents: { where: { statut: { in: ['Ouvert', 'En cours'] } }, select: { id: true } },
        },
      },
      metierTasks: { select: { id: true } },
    },
  });
  if (!commande) return null;

  const fichiersCount = await prisma.fileAsset.count({ where: { commandeId } });
  const stock = await assessCommandeStock(commandeId);
  const qualiteControle = await prisma.qualiteControle.findUnique({
    where: { commandeId },
    select: { statut: true },
  });

  const normalizedStatut = normalizeCommandeStatut(commandeStatutLabel(commande.statut));
  const qualiteFromDb = qualiteControle?.statut;
  const qualiteValidee =
    isQualiteStatutValide(qualiteFromDb)
    || commande.productionDossiers.some((d) =>
      d.etapes.some((e) => e.statut === 'Terminé'),
    );
  const incidentsOuverts = commande.productionDossiers.reduce(
    (n, d) => n + d.incidents.length,
    0,
  );

  /** Ledger Paiement = vérité ; colonnes commande = cache. */
  const relatedPaiements = await findCommandeRelatedPaiements(commandeId);
  const acompteLedger = paidTotal(relatedPaiements);
  const resteLedger = commandeRemainingAmount(commande.total, relatedPaiements);

  return {
    statut: normalizedStatut,
    avancement: commande.avancement,
    total: commande.total,
    acompte: acompteLedger,
    reste: resteLedger,
    requiredAcompteRatio: getAcompteRatioFromDevisNotes(commande.devis?.notes),
    batValides: commande.proofs.filter((p) => isBatValidated(p.statut)).length,
    totalBat: commande.proofs.length,
    fichiersCount,
    hasDossierProduction: commande.productionDossiers.length > 0,
    tachesCount: commande.metierTasks.length,
    qualiteValidee,
    incidentsOuverts,
    stockReady: stock.stockReady,
    stockBlockers: stock.blockers,
  };
}

export async function getCommandeWorkflowState(commandeId: string): Promise<{
  context: CommandeWorkflowContext;
  snapshot: CommandeWorkflowSnapshot;
} | null> {
  const context = await loadCommandeWorkflowContext(commandeId);
  if (!context) return null;
  const transitionsMap = await getCommandeTransitionMap();
  return { context, snapshot: buildCommandeWorkflowSnapshot(context, transitionsMap) };
}

/** Initialise tâches, dossier GPAO et brief studio — idempotent. */
export async function bootstrapCommandeWorkflow(
  commandeId: string,
  opts?: { userId?: string; userName?: string; priorite?: string },
) {
  const result = await afterCommandeCreated(commandeId, opts);
  return result;
}

export async function advanceCommandeJalon(
  commandeId: string,
  jalonId: string,
  opts?: { force?: boolean; userId?: string; userName?: string },
) {
  const before = await prisma.commande.findUnique({ where: { id: commandeId } });
  if (!before) return { error: 'NOT_FOUND' as const };

  const context = await loadCommandeWorkflowContext(commandeId);
  if (!context) return { error: 'NOT_FOUND' as const };

  const jalon = findJalonById(jalonId);
  if (!jalon) return { error: 'JALON_INCONNU' as const };

  const transitionsMap = await getCommandeTransitionMap();
  const check = validateJalonAdvance(jalonId, context, { force: opts?.force, transitionsMap });
  if (!check.ok) return { error: 'VALIDATION' as const, validation: check };

  if (jalon.statut === 'Prête' || jalon.statut === 'Livré') {
    try {
      const { consumeReservationsForCommande } = await import('@/lib/services/stock-service');
      await consumeReservationsForCommande(commandeId, {
        notes: `Consommation stock — jalon ${jalon.label}`,
        reference: before.numero,
        userId: opts?.userId,
        userName: opts?.userName,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur consommation stock';
      return {
        error: 'VALIDATION' as const,
        validation: { ok: false as const, message: `Stock : ${message}` },
      };
    }
  }

  const commande = await prisma.commande.update({
    where: { id: commandeId },
    data: {
      statut: commandeStatutFromLabel(jalon.statut),
      avancement: Math.max(before.avancement, jalon.avancement),
    },
    include: {
      client: { select: { id: true, name: true, code: true } },
    },
  });

  await logAuditChange({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'WORKFLOW_JALON',
    entity: 'Commande',
    entityId: commande.id,
    entityLabel: commande.numero,
    oldValue: { statut: before.statut, avancement: before.avancement },
    newValue: { statut: commande.statut, avancement: commande.avancement, jalon: jalon.label },
  });

  if (jalon.statut === 'Prête') {
    await ensureFactureForCommande(commandeId, {
      userId: opts?.userId,
      userName: opts?.userName,
    });
  }

  await applyProductionFluxOnCommandeTransition(commandeId, jalon.statut, {
    userId: opts?.userId,
    userName: opts?.userName,
  });

  const state = await getCommandeWorkflowState(commandeId);
  return { commande, jalon, workflow: state };
}

export async function transitionCommandeStatut(
  commandeId: string,
  toStatut: CommandeStatut,
  opts?: { force?: boolean; userId?: string; userName?: string },
) {
  const before = await prisma.commande.findUnique({ where: { id: commandeId } });
  if (!before) return { error: 'NOT_FOUND' as const };

  const context = await loadCommandeWorkflowContext(commandeId);
  if (!context) return { error: 'NOT_FOUND' as const };

  const fromStatut = context.statut;
  const transitionsMap = await getCommandeTransitionMap();
  const check = validateCommandeStatutTransition(fromStatut, toStatut, context, {
    force: opts?.force,
    transitionsMap,
  });
  if (!check.ok) return { error: 'VALIDATION' as const, validation: check };

  if (toStatut === 'Prête' || toStatut === 'Livré') {
    try {
      const { consumeReservationsForCommande } = await import('@/lib/services/stock-service');
      await consumeReservationsForCommande(commandeId, {
        notes: `Consommation stock — statut ${toStatut}`,
        reference: before.numero,
        userId: opts?.userId,
        userName: opts?.userName,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur consommation stock';
      return {
        error: 'VALIDATION' as const,
        validation: { ok: false as const, message: `Stock : ${message}` },
      };
    }
  }

  const avancement = Math.max(before.avancement, getAvancementForStatut(toStatut));
  const commande = await prisma.commande.update({
    where: { id: commandeId },
    data: {
      statut: commandeStatutFromLabel(toStatut),
      avancement,
      ...(toStatut === 'Livré' ? { dateLiv: new Date() } : {}),
    },
    include: {
      client: { select: { id: true, name: true, code: true } },
    },
  });

  await logAuditChange({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'WORKFLOW_STATUT',
    entity: 'Commande',
    entityId: commande.id,
    entityLabel: commande.numero,
    oldValue: { statut: before.statut, avancement: before.avancement },
    newValue: { statut: commande.statut, avancement: commande.avancement },
  });

  if (toStatut === 'Prête' || toStatut === 'Livré') {
    await ensureFactureForCommande(commandeId, {
      userId: opts?.userId,
      userName: opts?.userName,
    });
  }

  if (toStatut === 'Annulée') {
    try {
      const { releaseReservationsForCommande } = await import('@/lib/services/stock-service');
      await releaseReservationsForCommande(commandeId, {
        notes: `Annulation commande ${commande.numero}`,
        reference: commande.numero,
        userId: opts?.userId,
        userName: opts?.userName,
      });
    } catch (err) {
      console.warn('[workflow] libération réservations stock:', err);
    }
  }

  await applyProductionFluxOnCommandeTransition(commandeId, toStatut, {
    userId: opts?.userId,
    userName: opts?.userName,
  });

  const state = await getCommandeWorkflowState(commandeId);
  return { commande, workflow: state };
}
