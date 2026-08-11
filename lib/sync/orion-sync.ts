/**
 * Hub de synchronisation Orion — noyau unique de données partagé entre modules.
 * Chaque étape de la roadmap s'y branche pour garder dashboard, workspaces et flux métier alignés.
 */
import { prisma } from '@/lib/prisma';
import { type TaskType } from '@/lib/constants/metier-task';
import { GPAO_COMMANDE_STEPS } from '@/lib/metier/gpao-production-steps';
import { createMetierTask, getMetierTaskStats } from '@/lib/services/metier-task-service';
import { getRhStats } from '@/lib/services/rh-service';
import { getFinanceAdvStats } from '@/lib/services/finance-adv-service';
import { getGpaoStats, syncDossierForCommande, linkDossierToProduction } from '@/lib/services/gpao-dossier-service';
import { completedCommandeStatuts } from '@/lib/server/data/prisma-statut-bridge';
import { getStudioStats, syncBriefForCommande } from '@/lib/services/studio-service';
import { getCmStats } from '@/lib/services/cm-service';
import { getAnnexSyncStats } from '@/lib/services/annex-service';
import { getPermissionSyncStats } from '@/lib/services/permission-admin-service';

const DEFAULT_COMMANDE_TASKS: { title: string; type: TaskType; assigneeRole: string; estimatedMin: number }[] =
  GPAO_COMMANDE_STEPS;

/** Crée les tâches standard liées à une nouvelle commande — idempotent */
export async function syncTasksForCommande(
  commandeId: string,
  opts?: { priorite?: string; createdByName?: string; createdById?: string },
) {
  const existing = await prisma.metierTask.count({ where: { commandeId } });
  if (existing > 0) return { created: 0, skipped: true };

  const commande = await prisma.commande.findUnique({
    where: { id: commandeId },
    select: { id: true, numero: true, priorite: true, dateLiv: true },
  });
  if (!commande) return { created: 0, skipped: true };

  const priorite = opts?.priorite ?? commande.priorite ?? 'Normal';
  const dueDate = commande.dateLiv ?? null;

  let created = 0;
  for (const tpl of DEFAULT_COMMANDE_TASKS) {
    await createMetierTask({
      title: `${tpl.title} — ${commande.numero}`,
      description: `Étape GPAO « ${tpl.title} » — commande ${commande.numero}`,
      type: tpl.type,
      priorite,
      commandeId,
      assigneeRole: tpl.assigneeRole,
      estimatedMin: tpl.estimatedMin,
      dueDate,
      createdById: opts?.createdById ?? null,
      createdByName: opts?.createdByName ?? 'Orion Sync',
    });
    created++;
  }

  return { created, skipped: false };
}

/** Crée le dossier GPAO 16 étapes pour une commande — idempotent */
export async function syncDossierForCommandeFromSync(
  commandeId: string,
  opts?: { priorite?: string; delai?: Date | null },
) {
  return syncDossierForCommande(commandeId, opts);
}

export { linkDossierToProduction };

/** Crée le brief studio pour une commande — idempotent */
export async function syncBriefForCommandeFromSync(commandeId: string) {
  return syncBriefForCommande(commandeId);
}

/** Lie une production existante aux tâches ouvertes de la commande */
export async function syncProductionToTasks(productionId: string, commandeId: string) {
  await prisma.metierTask.updateMany({
    where: {
      commandeId,
      productionId: null,
      type: { in: ['production', 'finition'] },
      status: { notIn: ['Terminée', 'Annulée'] },
    },
    data: { productionId },
  });
}

/** Stats synchronisées pour dashboard + workspaces */
export async function getOrionSyncStats(role?: string) {
  const typeByRole: Record<string, TaskType | undefined> = {
    production: 'production',
    designer: 'graphisme',
    livraison: 'logistique',
    commercial: 'commercial',
  };

  const taskType = role ? typeByRole[role] : undefined;

  const [taskStats, commStats, rhStats, financeStats, gpaoStats, studioStats, cmStats, annexStats, permStats] = await Promise.all([
    getMetierTaskStats(taskType ? { type: taskType } : undefined),
    Promise.all([
      prisma.teamMessage.count().catch(() => 0),
      prisma.teamSuggestion.count({ where: { status: 'En étude' } }).catch(() => 0),
    ]).then(([messages, suggestionsPending]) => ({ messages, suggestionsPending })),
    getRhStats().catch(() => ({
      totalActifs: 0,
      presentsToday: 0,
      retardsToday: 0,
      absencesPending: 0,
      announcements: 0,
      presentNow: 0,
    })),
    getFinanceAdvStats().catch(() => ({
      entreesMois: 0,
      sortiesMois: 0,
      tresorerieMois: 0,
      ventesDirectesMois: 0,
      ventesDirectesCount: 0,
      chargesMois: 0,
      impayes: 0,
    })),
    getGpaoStats().catch(() => ({
      total: 0,
      enCours: 0,
      bloques: 0,
      incidentsOuverts: 0,
      enRetard: 0,
    })),
    getStudioStats().catch(() => ({
      total: 0,
      enCours: 0,
      fichiersManquants: 0,
      batEnAttente: 0,
      corrections: 0,
      pretsImpression: 0,
      versionsPending: 0,
    })),
    getCmStats().catch(() => ({
      campagnesActives: 0,
      postsAPlanifier: 0,
      relancesPending: 0,
      relancesOverdue: 0,
      templates: 0,
    })),
    getAnnexSyncStats().catch(() => ({
      totalAnnexes: 0,
      overview: [],
      employeesBySite: {},
    })),
    getPermissionSyncStats().catch(() => ({
      roleOverrides: 0,
      userOverrides: 0,
      usersWithOverrides: 0,
      editableRoles: 0,
      modules: 0,
    })),
  ]);

  return {
    tasks: {
      open: taskStats.totalOpen,
      blocked: taskStats.blocked,
      dueToday: taskStats.todayDue,
      byType: taskStats.byType,
    },
    communication: commStats,
    rh: rhStats,
    finance: financeStats,
    gpao: gpaoStats,
    studio: studioStats,
    cm: cmStats,
    annexes: annexStats,
    permissions: permStats,
    syncedAt: new Date().toISOString(),
  };
}

/** Backfill tâches pour commandes actives sans tâches (migration douce) */
export async function backfillCommandeTasks(
  limit = 50,
  client: typeof prisma = prisma,
) {
  try {
    const commandes = await client.commande.findMany({
      where: { statut: { notIn: [...completedCommandeStatuts()] } },
      select: { id: true },
      take: limit,
    });

    let totalCreated = 0;
    for (const c of commandes) {
      const r = await syncTasksForCommande(c.id);
      totalCreated += r.created;
    }
    return { commandes: commandes.length, tasksCreated: totalCreated };
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    // P2021 = table absente (seed E2E / DB partielle) — ne pas faire échouer le seed global
    if (code === 'P2021') {
      console.warn('[backfillCommandeTasks] table Commande absente — backfill ignoré');
      return { commandes: 0, tasksCreated: 0 };
    }
    throw error;
  }
}
