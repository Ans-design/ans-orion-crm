import { prisma } from '@/lib/prisma';
import { CommandeStatut } from '@prisma/client';
import { logAuditChange } from '@/lib/audit';
import { createMetierTask } from '@/lib/services/metier-task-service';
import { TASK_TYPE_ROLES, type TaskType } from '@/lib/constants/metier-task';
import { schedulePlanningSlotForCommande } from '@/lib/services/planning-commande-service';
import {
  getWorkflowBackofficePayload,
  listWorkflowRules,
  resetWorkflowTransitionsToDefaults,
} from '@/lib/services/workflow-transition-service';
import { commandeStatutLabel } from '@/lib/server/data/prisma-statut-bridge';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import {
  PRODUCTION_FLUX_CONFIG_KEY,
  buildDefaultProductionFluxConfig,
  healCustomStepsForPlanning,
  prepareNewFluxStep,
  type ProductionFluxConfig,
  type ProductionFluxRule,
  type ProductionFluxStep,
  type ProductionFluxSyncJournalEntry,
  type ProductionFluxTransition,
} from '@/lib/data/production-flux-config';

export type ProductionFluxAnomaly = {
  id: string;
  level: 'warning' | 'error';
  message: string;
  stepId?: string;
  transitionId?: string;
  ruleId?: string;
};

export type ProductionFluxStepView = ProductionFluxStep & {
  commandeCount: number;
  alertCount: number;
};

export type ProductionFluxPayload = {
  ok: true;
  config: ProductionFluxConfig;
  steps: ProductionFluxStepView[];
  transitions: (ProductionFluxTransition & { fromName: string; toName: string })[];
  rules: ProductionFluxRule[];
  kpis: {
    activeSteps: number;
    activeTransitions: number;
    blockingRules: number;
    tasksSynced: number;
    planningSynced: number;
    anomalies: number;
  };
  anomalies: ProductionFluxAnomaly[];
  syncJournal: ProductionFluxSyncJournalEntry[];
  workflowRules: Awaited<ReturnType<typeof getWorkflowBackofficePayload>>;
  roles: { id: string; label: string }[];
  history: {
    id: string;
    at: string;
    userName: string | null;
    action: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
};

const JOURNAL_KEY = 'production-flux-sync-journal';

async function loadSyncJournal(): Promise<ProductionFluxSyncJournalEntry[]> {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { configKey: JOURNAL_KEY } });
    if (row?.data && Array.isArray(row.data)) return row.data as ProductionFluxSyncJournalEntry[];
  } catch {
    /* ignore */
  }
  return [];
}

async function appendSyncJournal(entry: Omit<ProductionFluxSyncJournalEntry, 'id' | 'at'>): Promise<void> {
  const journal = await loadSyncJournal();
  const next: ProductionFluxSyncJournalEntry = {
    id: `sj-${Date.now()}`,
    at: new Date().toISOString(),
    ...entry,
  };
  const trimmed = [next, ...journal].slice(0, 50);
  await prisma.systemConfig.upsert({
    where: { configKey: JOURNAL_KEY },
    create: { configKey: JOURNAL_KEY, data: trimmed as object },
    update: { data: trimmed as object },
  });
}

export async function getProductionFluxConfig(): Promise<ProductionFluxConfig> {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { configKey: PRODUCTION_FLUX_CONFIG_KEY } });
    if (row?.data && typeof row.data === 'object') {
      const data = row.data as ProductionFluxConfig;
      if (Array.isArray(data.steps) && data.steps.length > 0) {
        const healed = healCustomStepsForPlanning(data);
        if (!healed.changed) return healed.config;
        try {
          return await saveProductionFluxConfig(healed.config);
        } catch {
          return healed.config;
        }
      }
    }
  } catch {
    /* fallback */
  }
  return buildDefaultProductionFluxConfig();
}

export async function saveProductionFluxConfig(
  config: ProductionFluxConfig,
  userId?: string,
): Promise<ProductionFluxConfig> {
  const payload: ProductionFluxConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  };
  await prisma.systemConfig.upsert({
    where: { configKey: PRODUCTION_FLUX_CONFIG_KEY },
    create: { configKey: PRODUCTION_FLUX_CONFIG_KEY, data: payload as object, updatedBy: userId },
    update: { data: payload as object, updatedBy: userId },
  });
  return payload;
}

function stepById(config: ProductionFluxConfig, id: string): ProductionFluxStep | undefined {
  return config.steps.find((s) => s.id === id);
}

export function detectWorkflowAnomalies(config: ProductionFluxConfig): ProductionFluxAnomaly[] {
  const anomalies: ProductionFluxAnomaly[] = [];
  const activeSteps = config.steps.filter((s) => s.active);

  for (const step of activeSteps) {
    if (!step.responsibleRole) {
      anomalies.push({ id: `a-role-${step.id}`, level: 'error', message: `Étape « ${step.name} » sans rôle responsable`, stepId: step.id });
    }
    if (step.required && step.targetDelayHours <= 0 && step.id !== 'client' && step.id !== 'historique-client') {
      anomalies.push({ id: `a-delay-${step.id}`, level: 'warning', message: `Délai cible manquant pour « ${step.name} »`, stepId: step.id });
    }
    if (step.generatesTask && !step.taskType) {
      anomalies.push({ id: `a-task-${step.id}`, level: 'warning', message: `Tâche générée sans type pour « ${step.name} »`, stepId: step.id });
    }
    if (step.visiblePlanning && !step.planningResource) {
      anomalies.push({ id: `a-plan-${step.id}`, level: 'warning', message: `Planning activé sans ressource pour « ${step.name} »`, stepId: step.id });
    }
    if (!step.commandeStatut && step.linkedModules.includes('commande') && step.required) {
      anomalies.push({ id: `a-statut-${step.id}`, level: 'warning', message: `Statut commande non relié pour « ${step.name} »`, stepId: step.id });
    }
  }

  for (const t of config.transitions) {
    if (!t.active) continue;
    const from = stepById(config, t.fromStepId);
    const to = stepById(config, t.toStepId);
    if (!from || !to) {
      anomalies.push({ id: `a-tr-${t.id}`, level: 'error', message: `Transition « ${t.label} » avec étape manquante`, transitionId: t.id });
    }
    if (!t.authorizedRole) {
      anomalies.push({ id: `a-tr-role-${t.id}`, level: 'warning', message: `Transition « ${t.label} » sans rôle autorisé`, transitionId: t.id });
    }
  }

  const hasImpression = activeSteps.some((s) => s.id === 'impression');
  const hasBatValide = activeSteps.some((s) => s.id === 'bat-client-valide');
  if (hasImpression && hasBatValide) {
    const impToBat = config.transitions.some((t) => t.fromStepId === 'bat-client-valide' && t.toStepId === 'impression' && t.active);
    if (!impToBat) {
      anomalies.push({ id: 'a-imp-bat', level: 'error', message: 'Impression sans transition depuis BAT client validé' });
    }
  }

  const hasLivraison = activeSteps.some((s) => s.id === 'livraison');
  const hasCq = activeSteps.some((s) => s.id === 'controle-qualite');
  if (hasLivraison && !hasCq) {
    anomalies.push({ id: 'a-liv-cq', level: 'error', message: 'Livraison sans étape contrôle qualité' });
  }

  const blockingRules = config.rules.filter((r) => r.active && r.level === 'blocking');
  const contradictory = blockingRules.filter((r) =>
    r.condition.includes('sans') && r.action.includes('Bloquer') && r.impactedModule === 'production',
  );
  if (contradictory.length > 2) {
    anomalies.push({ id: 'a-rules-contra', level: 'warning', message: 'Règles bloquantes potentiellement redondantes', ruleId: contradictory[0]?.id });
  }

  return anomalies;
}

async function countCommandesByStatut(): Promise<Record<string, number>> {
  const rows = await prisma.commande.groupBy({
    by: ['statut'],
    _count: { id: true },
    where: { statut: { notIn: [CommandeStatut.Annulee, CommandeStatut.Suspendu] } },
  }).catch(() => []);

  const map: Record<string, number> = {};
  for (const row of rows) {
    const label = commandeStatutLabel(row.statut);
    map[label] = (map[label] ?? 0) + row._count.id;
  }
  return map;
}

export async function getProductionFluxPayload(): Promise<ProductionFluxPayload> {
  const [config, workflowRules, statutCounts, taskCount, slotCount, journal, historyRows] = await Promise.all([
    getProductionFluxConfig(),
    getWorkflowBackofficePayload(),
    countCommandesByStatut(),
    prisma.metierTask.count({ where: { commandeId: { not: null } } }).catch(() => 0),
    prisma.productionSlot.count({ where: { commandeId: { not: null } } }).catch(() => 0),
    loadSyncJournal(),
    prisma.ruleVersion.findMany({
      where: { entityType: 'production-flux' },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }).catch(() => []),
  ]);

  const anomalies = detectWorkflowAnomalies(config);

  const steps: ProductionFluxStepView[] = config.steps
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((step) => {
      const commandeCount = step.commandeStatut ? (statutCounts[step.commandeStatut] ?? 0) : 0;
      const alertCount = anomalies.filter((a) => a.stepId === step.id).length;
      return { ...step, commandeCount, alertCount };
    });

  const transitions = config.transitions.map((t) => ({
    ...t,
    fromName: stepById(config, t.fromStepId)?.name ?? t.fromStepId,
    toName: stepById(config, t.toStepId)?.name ?? t.toStepId,
  }));

  const activeSteps = config.steps.filter((s) => s.active).length;
  const activeTransitions = config.transitions.filter((t) => t.active).length;
  const blockingRules = config.rules.filter((r) => r.active && r.level === 'blocking').length;

  const roles = Object.entries(ROLE_LABELS).map(([id, label]) => ({ id, label }));

  return {
    ok: true,
    config,
    steps,
    transitions,
    rules: config.rules,
    kpis: {
      activeSteps,
      activeTransitions,
      blockingRules,
      tasksSynced: taskCount,
      planningSynced: slotCount,
      anomalies: anomalies.length,
    },
    anomalies,
    syncJournal: journal,
    workflowRules,
    roles,
    history: historyRows.map((h) => ({
      id: h.id,
      at: h.createdAt.toISOString(),
      userName: h.userId,
      action: h.reason ?? 'Modification',
      oldValue: h.oldValue,
      newValue: h.newValue,
    })),
  };
}

export async function upsertProductionFluxStep(
  step: ProductionFluxStep,
  opts?: {
    userId?: string;
    userName?: string;
    linkFromStepId?: string | null;
    transitionMode?: 'auto' | 'manual';
  },
): Promise<ProductionFluxConfig> {
  const config = await getProductionFluxConfig();
  const idx = config.steps.findIndex((s) => s.id === step.id);
  const oldValue = idx >= 0 ? config.steps[idx] : null;
  const isCreate = idx < 0;
  const nextStep = isCreate ? prepareNewFluxStep(step) : step;

  if (idx >= 0) config.steps[idx] = nextStep;
  else config.steps.push(nextStep);

  // Nouvelle étape → créer aussi une transition (reproduite dans le tableau Transitions)
  if (isCreate) {
    const defaultFrom =
      [...config.steps]
        .filter((s) => s.id !== nextStep.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .at(-1)?.id
      ?? null;
    const linkFrom =
      opts && 'linkFromStepId' in (opts ?? {}) && opts?.linkFromStepId !== undefined
        ? opts.linkFromStepId
        : defaultFrom;

    if (linkFrom && linkFrom !== nextStep.id) {
      const fromStep = config.steps.find((s) => s.id === linkFrom);
      const already = config.transitions.some(
        (t) => t.fromStepId === linkFrom && t.toStepId === nextStep.id,
      );
      if (fromStep && !already) {
        const mode = opts?.transitionMode ?? 'manual';
        config.transitions.push({
          id: `t-${linkFrom}-${nextStep.id}`,
          fromStepId: linkFrom,
          toStepId: nextStep.id,
          condition: `Passage vers ${nextStep.name}`,
          authorizedRole: nextStep.responsibleRole,
          mode,
          generatesTask: nextStep.generatesTask,
          updatesPlanning: true,
          active: true,
          label: `${fromStep.name} → ${nextStep.name}`,
        });
      }
    }
  }

  const saved = await saveProductionFluxConfig(config, opts?.userId);

  await prisma.ruleVersion.create({
    data: {
      entityType: 'production-flux',
      entityId: nextStep.id,
      oldValue: oldValue as object | undefined,
      newValue: nextStep as object,
      reason: isCreate ? 'Nouvelle étape' : 'Mise à jour étape',
      userId: opts?.userId,
    },
  }).catch(() => null);

  await logAuditChange({
    userId: opts?.userId,
    userName: opts?.userName,
    action: isCreate ? 'PRODUCTION_FLUX_STEP_CREATE' : 'PRODUCTION_FLUX_STEP_UPDATE',
    entity: 'ProductionFluxStep',
    entityId: nextStep.id,
    entityLabel: nextStep.name,
    oldValue: oldValue ?? undefined,
    newValue: nextStep as unknown as Record<string, unknown>,
  });

  return saved;
}

export async function deleteProductionFluxStep(
  stepId: string,
  opts?: { userId?: string; userName?: string },
): Promise<ProductionFluxConfig> {
  const config = await getProductionFluxConfig();
  const step = config.steps.find((s) => s.id === stepId);
  if (!step) {
    throw new Error('Étape introuvable');
  }

  const ordered = [...config.steps].sort((a, b) => a.sortOrder - b.sortOrder);
  const pos = ordered.findIndex((s) => s.id === stepId);
  const prev = pos > 0 ? ordered[pos - 1] : null;
  const next = pos >= 0 && pos < ordered.length - 1 ? ordered[pos + 1] : null;

  const incoming = config.transitions.filter((t) => t.toStepId === stepId);
  const outgoing = config.transitions.filter((t) => t.fromStepId === stepId);

  config.steps = config.steps.filter((s) => s.id !== stepId);
  config.transitions = config.transitions.filter(
    (t) => t.fromStepId !== stepId && t.toStepId !== stepId,
  );

  // Recoller la chaîne : prev → next si les deux voisins existent
  if (prev && next) {
    const bridgeExists = config.transitions.some(
      (t) => t.fromStepId === prev.id && t.toStepId === next.id,
    );
    if (!bridgeExists) {
      const template = outgoing[0] ?? incoming[0];
      config.transitions.push({
        id: `t-${prev.id}-${next.id}`,
        fromStepId: prev.id,
        toStepId: next.id,
        condition: template?.condition || `Passage vers ${next.name}`,
        authorizedRole: template?.authorizedRole || next.responsibleRole,
        mode: template?.mode ?? 'manual',
        generatesTask: template?.generatesTask ?? next.generatesTask,
        updatesPlanning: template?.updatesPlanning ?? next.visiblePlanning,
        active: true,
        label: `${prev.name} → ${next.name}`,
      });
    }
  }

  // Renormaliser sortOrder
  config.steps = [...config.steps]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s, i) => ({ ...s, sortOrder: i }));

  const saved = await saveProductionFluxConfig(config, opts?.userId);

  await prisma.ruleVersion.create({
    data: {
      entityType: 'production-flux',
      entityId: stepId,
      oldValue: step as object,
      newValue: { deleted: true } as object,
      reason: 'Suppression étape',
      userId: opts?.userId,
    },
  }).catch(() => null);

  await logAuditChange({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'PRODUCTION_FLUX_STEP_DELETE',
    entity: 'ProductionFluxStep',
    entityId: stepId,
    entityLabel: step.name,
    oldValue: step as unknown as Record<string, unknown>,
  });

  return saved;
}

export async function updateProductionFluxTransition(
  transition: ProductionFluxTransition,
  opts?: { userId?: string },
): Promise<ProductionFluxConfig> {
  const config = await getProductionFluxConfig();
  const idx = config.transitions.findIndex((t) => t.id === transition.id);
  if (idx >= 0) config.transitions[idx] = transition;
  else config.transitions.push(transition);
  return saveProductionFluxConfig(config, opts?.userId);
}

export async function updateProductionFluxRule(
  rule: ProductionFluxRule,
  opts?: { userId?: string },
): Promise<ProductionFluxConfig> {
  const config = await getProductionFluxConfig();
  const idx = config.rules.findIndex((r) => r.id === rule.id);
  if (idx >= 0) config.rules[idx] = rule;
  else config.rules.push(rule);
  return saveProductionFluxConfig(config, opts?.userId);
}

function taskTypeForStep(step: ProductionFluxStep): TaskType | null {
  if (!step.taskType) return null;
  const allowed: TaskType[] = ['production', 'graphisme', 'finition', 'logistique', 'commercial'];
  return allowed.includes(step.taskType as TaskType) ? (step.taskType as TaskType) : null;
}

/** Crée les tâches manquantes selon la config workflow pour toutes les commandes actives */
export async function syncTasksFromProductionFlux(opts?: {
  userId?: string;
  userName?: string;
}): Promise<{ created: number; scanned: number }> {
  const config = await getProductionFluxConfig();
  const taskSteps = config.steps.filter((s) => s.active && s.generatesTask && s.taskType);

  const commandes = await prisma.commande.findMany({
    where: { statut: { notIn: [CommandeStatut.Annulee, CommandeStatut.Suspendu, CommandeStatut.Livre, CommandeStatut.Livree, CommandeStatut.Terminee] } },
    select: { id: true, numero: true, statut: true, priorite: true, dateLiv: true },
    take: 200,
  });

  let created = 0;
  for (const cmd of commandes) {
    const label = commandeStatutLabel(cmd.statut);
    const matchingSteps = taskSteps.filter((s) => s.commandeStatut === label);
    for (const step of matchingSteps) {
      const type = taskTypeForStep(step);
      if (!type) continue;

      const existing = await prisma.metierTask.findFirst({
        where: { commandeId: cmd.id, type, status: { notIn: ['Terminée', 'Annulée'] } },
      });
      if (existing) continue;

      await createMetierTask({
        title: `${step.name} — ${cmd.numero}`,
        description: `Tâche auto — workflow ${step.name}`,
        type,
        priorite: cmd.priorite ?? 'Normal',
        commandeId: cmd.id,
        assigneeRole: TASK_TYPE_ROLES[type] ?? step.responsibleRole,
        estimatedMin: Math.max(30, step.targetDelayHours * 60),
        dueDate: cmd.dateLiv,
        createdById: opts?.userId ?? null,
        createdByName: opts?.userName ?? 'Production & Flux',
      });
      created++;
    }
  }

  await appendSyncJournal({
    type: 'tasks',
    summary: `${created} tâche(s) créée(s) sur ${commandes.length} commande(s)`,
    count: created,
    userId: opts?.userId,
    userName: opts?.userName,
  });

  return { created, scanned: commandes.length };
}

/** Crée les créneaux planning manquants pour commandes actives */
export async function syncPlanningFromProductionFlux(opts?: {
  userId?: string;
  userName?: string;
}): Promise<{ created: number; scanned: number }> {
  const config = await getProductionFluxConfig();
  const planifiable = config.steps.some((s) => s.active && s.visiblePlanning);

  const commandes = await prisma.commande.findMany({
    where: { statut: { in: [CommandeStatut.En_production, CommandeStatut.En_finition, CommandeStatut.A_planifier] } },
    select: { id: true },
    take: 200,
  });

  let created = 0;
  if (planifiable) {
    for (const cmd of commandes) {
      const result = await schedulePlanningSlotForCommande(cmd.id);
      if (result && 'created' in result && result.created) created++;
    }
  }

  await appendSyncJournal({
    type: 'planning',
    summary: `${created} créneau(x) planning sur ${commandes.length} commande(s)`,
    count: created,
    userId: opts?.userId,
    userName: opts?.userName,
  });

  return { created, scanned: commandes.length };
}

export async function simulateProductionFlux(): Promise<{
  path: string[];
  transitions: string[];
  blockers: string[];
}> {
  const config = await getProductionFluxConfig();
  const path: string[] = [];
  const transitions: string[] = [];
  const blockers: string[] = [];

  let current = config.steps.find((s) => s.id === 'devis' && s.active) ?? config.steps.find((s) => s.active);
  if (!current) return { path: [], transitions: [], blockers: ['Aucune étape active'] };

  const visited = new Set<string>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.push(current.name);
    const next = config.transitions.find((t) => t.active && t.fromStepId === current!.id);
    if (!next) break;
    transitions.push(next.label);
    const anomalies = detectWorkflowAnomalies(config).filter((a) => a.transitionId === next.id);
    if (anomalies.length) blockers.push(...anomalies.map((a) => a.message));
    current = stepById(config, next.toStepId);
    if (current && !current.active) {
      blockers.push(`Étape inactive : ${current.name}`);
      break;
    }
  }

  await appendSyncJournal({
    type: 'simulate',
    summary: `Simulation : ${path.length} étape(s), ${blockers.length} alerte(s)`,
    count: path.length,
  });

  return { path, transitions, blockers };
}

export async function resetProductionFluxToDefaults(opts?: {
  userId?: string;
  userName?: string;
}): Promise<ProductionFluxConfig> {
  const defaults = buildDefaultProductionFluxConfig();
  await saveProductionFluxConfig(defaults, opts?.userId);
  await resetWorkflowTransitionsToDefaults();
  await appendSyncJournal({
    type: 'reset',
    summary: 'Configuration workflow réinitialisée aux valeurs par défaut',
    count: defaults.steps.length,
    userId: opts?.userId,
    userName: opts?.userName,
  });
  return defaults;
}

export async function exportProductionFluxConfig(): Promise<ProductionFluxConfig & { workflowRules: unknown }> {
  const [config, { rules }] = await Promise.all([
    getProductionFluxConfig(),
    listWorkflowRules(),
  ]);
  return { ...config, workflowRules: rules };
}

/** Runtime : applique sync tâches/planning après changement statut commande */
export async function applyProductionFluxOnCommandeTransition(
  commandeId: string,
  toStatutLabel: string,
  opts?: { userId?: string; userName?: string },
): Promise<{ taskCreated: boolean; planningCreated: boolean }> {
  const config = await getProductionFluxConfig();
  const matchingSteps = config.steps.filter(
    (s) => s.active && s.commandeStatut === toStatutLabel,
  );

  let taskCreated = false;
  let planningCreated = false;

  const commande = await prisma.commande.findUnique({
    where: { id: commandeId },
    select: { numero: true, priorite: true, dateLiv: true },
  });
  if (!commande) return { taskCreated, planningCreated };

  for (const step of matchingSteps) {
    if (step.generatesTask && step.taskType) {
      const type = taskTypeForStep(step);
      if (type) {
        const existing = await prisma.metierTask.findFirst({
          where: { commandeId, type, status: { notIn: ['Terminée', 'Annulée'] } },
        });
        if (!existing) {
          await createMetierTask({
            title: `${step.name} — ${commande.numero}`,
            description: `Tâche auto — transition vers ${toStatutLabel}`,
            type,
            priorite: commande.priorite ?? 'Normal',
            commandeId,
            assigneeRole: TASK_TYPE_ROLES[type] ?? step.responsibleRole,
            estimatedMin: Math.max(30, step.targetDelayHours * 60),
            dueDate: commande.dateLiv,
            createdById: opts?.userId ?? null,
            createdByName: opts?.userName ?? 'Workflow',
          });
          taskCreated = true;
        }
      }
    }

    if (step.visiblePlanning) {
      const result = await schedulePlanningSlotForCommande(commandeId);
      if (result && 'created' in result && result.created) planningCreated = true;
    }
  }

  return { taskCreated, planningCreated };
}
