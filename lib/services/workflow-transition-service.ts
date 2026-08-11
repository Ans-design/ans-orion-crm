import { prisma } from '@/lib/prisma';
import { COMMANDE_STATUTS, type CommandeStatut } from '@/lib/data/commande-status';
import {
  COMMANDE_STATUT_TRANSITIONS,
  isCommandeStatut,
  type CommandeStatutTransitionMap,
} from '@/lib/workflow/commande-workflow';
import {
  RECOMMENDED_TRANSITIONS,
  CRM_WORKFLOW_CHAIN,
  CONFIGURABLE_STATUSES,
  type WorkflowTransition,
} from '@/lib/data/business-workflow';

export type WorkflowTransitionRuleDto = {
  id: string;
  entity: string;
  fromStatut: string;
  toStatut: string;
  enabled: boolean;
  actionKey: string | null;
  module: string | null;
  label: string | null;
  sortOrder: number;
};

function rowToDto(row: {
  id: string;
  entity: string;
  fromStatut: string;
  toStatut: string;
  enabled: boolean;
  actionKey: string | null;
  module: string | null;
  label: string | null;
  sortOrder: number;
}): WorkflowTransitionRuleDto {
  return {
    id: row.id,
    entity: row.entity,
    fromStatut: row.fromStatut,
    toStatut: row.toStatut,
    enabled: row.enabled,
    actionKey: row.actionKey,
    module: row.module,
    label: row.label,
    sortOrder: row.sortOrder,
  };
}

function emptyCommandeMap(): CommandeStatutTransitionMap {
  return Object.fromEntries(
    COMMANDE_STATUTS.map((s) => [s, [] as CommandeStatut[]]),
  ) as CommandeStatutTransitionMap;
}

/** Seed idempotent des transitions par défaut → DB */
export async function ensureWorkflowTransitionsSeeded(): Promise<number> {
  try {
    const count = await prisma.workflowTransitionRule.count();
    if (count > 0) return count;

    let order = 0;
    for (const [from, targets] of Object.entries(COMMANDE_STATUT_TRANSITIONS) as [CommandeStatut, CommandeStatut[]][]) {
      for (const to of targets) {
        await prisma.workflowTransitionRule.create({
          data: {
            entity: 'commande',
            fromStatut: from,
            toStatut: to,
            enabled: true,
            sortOrder: order++,
          },
        });
      }
    }

    for (let i = 0; i < RECOMMENDED_TRANSITIONS.length; i++) {
      const t = RECOMMENDED_TRANSITIONS[i];
      await prisma.workflowTransitionRule.create({
        data: {
          entity: 'chain',
          fromStatut: t.from,
          toStatut: t.to,
          enabled: true,
          actionKey: t.action,
          module: t.module,
          label: `${t.from} → ${t.to}`,
          sortOrder: i,
        },
      });
    }

    return order + RECOMMENDED_TRANSITIONS.length;
  } catch {
    return 0;
  }
}

export async function getCommandeTransitionMap(): Promise<CommandeStatutTransitionMap> {
  await ensureWorkflowTransitionsSeeded();
  try {
    const rows = await prisma.workflowTransitionRule.findMany({
      where: { entity: 'commande', enabled: true },
      orderBy: [{ fromStatut: 'asc' }, { sortOrder: 'asc' }],
    });
    if (rows.length === 0) return COMMANDE_STATUT_TRANSITIONS;

    const map = emptyCommandeMap();
    for (const row of rows) {
      if (!isCommandeStatut(row.fromStatut) || !isCommandeStatut(row.toStatut)) continue;
      const list = map[row.fromStatut];
      if (!list.includes(row.toStatut)) list.push(row.toStatut);
    }
    return map;
  } catch {
    return COMMANDE_STATUT_TRANSITIONS;
  }
}

export async function listChainTransitions(): Promise<WorkflowTransition[]> {
  await ensureWorkflowTransitionsSeeded();
  try {
    const rows = await prisma.workflowTransitionRule.findMany({
      where: { entity: 'chain', enabled: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (rows.length === 0) return [...RECOMMENDED_TRANSITIONS];
    return rows.map((r) => ({
      from: r.fromStatut,
      to: r.toStatut,
      action: r.actionKey ?? r.id,
      module: r.module ?? 'workflow',
    }));
  } catch {
    return [...RECOMMENDED_TRANSITIONS];
  }
}

export async function listWorkflowRules(entity?: string): Promise<{
  rules: WorkflowTransitionRuleDto[];
  source: 'db' | 'code';
}> {
  await ensureWorkflowTransitionsSeeded();
  try {
    const rules = await prisma.workflowTransitionRule.findMany({
      where: entity ? { entity } : undefined,
      orderBy: [{ entity: 'asc' }, { fromStatut: 'asc' }, { sortOrder: 'asc' }],
    });
    return {
      rules: rules.map(rowToDto),
      source: rules.length > 0 ? 'db' : 'code',
    };
  } catch {
    return { rules: [], source: 'code' };
  }
}

export async function setWorkflowRuleEnabled(id: string, enabled: boolean): Promise<WorkflowTransitionRuleDto | null> {
  try {
    const row = await prisma.workflowTransitionRule.update({
      where: { id },
      data: { enabled },
    });
    return rowToDto(row);
  } catch {
    return null;
  }
}

export async function createWorkflowRule(input: {
  entity: string;
  fromStatut: string;
  toStatut: string;
  actionKey?: string;
  module?: string;
  label?: string;
}): Promise<WorkflowTransitionRuleDto> {
  const maxOrder = await prisma.workflowTransitionRule.aggregate({
    where: { entity: input.entity, fromStatut: input.fromStatut },
    _max: { sortOrder: true },
  });

  const row = await prisma.workflowTransitionRule.upsert({
    where: {
      entity_fromStatut_toStatut: {
        entity: input.entity,
        fromStatut: input.fromStatut,
        toStatut: input.toStatut,
      },
    },
    create: {
      entity: input.entity,
      fromStatut: input.fromStatut,
      toStatut: input.toStatut,
      enabled: true,
      actionKey: input.actionKey ?? null,
      module: input.module ?? null,
      label: input.label ?? null,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
    update: {
      enabled: true,
      actionKey: input.actionKey ?? undefined,
      module: input.module ?? undefined,
      label: input.label ?? undefined,
    },
  });

  return rowToDto(row);
}

export async function resetWorkflowTransitionsToDefaults(): Promise<number> {
  await prisma.workflowTransitionRule.deleteMany({
    where: { entity: { in: ['commande', 'chain'] } },
  });
  return ensureWorkflowTransitionsSeeded();
}

export async function getWorkflowBackofficePayload() {
  const [{ rules, source }, commandeMap] = await Promise.all([
    listWorkflowRules(),
    getCommandeTransitionMap(),
  ]);

  const chain = await listChainTransitions();

  return {
    chain: CRM_WORKFLOW_CHAIN,
    transitions: chain,
    configurableStatuses: CONFIGURABLE_STATUSES,
    commandeTransitionRules: rules.filter((r) => r.entity === 'commande'),
    chainTransitionRules: rules.filter((r) => r.entity === 'chain'),
    commandeTransitionsPreview: Object.entries(commandeMap).flatMap(([from, targets]) =>
      targets.map((to) => ({ from, to, entity: 'commande' as const })),
    ),
    source,
    registries: {
      commande: COMMANDE_STATUTS,
    },
  };
}
