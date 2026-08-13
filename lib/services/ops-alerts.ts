import { prisma } from '@/lib/prisma';
import { getStockAlerts } from '@/lib/services/stock-service';
import { listActiveTickerTexts } from '@/lib/services/ticker-admin-service';
import { getSyncDriftTickerAlerts } from '@/lib/services/sync-drift-service';
import {
  formatBroadcastTickerLabel,
  formatPosteTickerAlert,
  rankPosteTickerTask,
} from '@/lib/metier/poste-ticker';
import {
  commandeRetardStatut,
  completedCommandeStatuts,
  pendingDevisStatuts,
  planifierCommandeStatuts,
  unpaidFactureStatuts,
} from '@/lib/server/data/prisma-statut-bridge';
import { startOfBusinessDay } from '@/lib/kpi/business-clock';

export type TickerAlert = {
  id: string;
  type: string;
  label: string;
  href: string;
  severity: 'info' | 'warn' | 'critical';
};

export type TickerViewer = {
  userId?: string;
  userName?: string;
  role?: string;
};

function severityForType(type: string): TickerAlert['severity'] {
  if (type === 'urgent' || type === 'retard' || type === 'machine-down' || type === 'task-blocked' || type === 'sync-drift-critical') return 'critical';
  if (type === 'facture' || type === 'reclamation' || type === 'maintenance' || type === 'sync-drift' || type === 'retard-prod') return 'warn';
  return 'info';
}

function broadcastSeverity(text: string): TickerAlert['severity'] {
  if (text.includes('🚨')) return 'critical';
  if (text.includes('⚠')) return 'warn';
  return 'info';
}

async function getBroadcastTickerAlerts(): Promise<TickerAlert[]> {
  const custom = await listActiveTickerTexts().catch(() => []);
  return custom.map((text, i) => ({
    id: `broadcast-${i}`,
    type: 'broadcast',
    label: formatBroadcastTickerLabel(text),
    href: '/dashboard',
    severity: broadcastSeverity(text),
  }));
}

async function getMinePosteTickerAlerts(viewer?: TickerViewer): Promise<TickerAlert[]> {
  if (!viewer?.userId && !viewer?.userName) return [];
  const or: { assigneeId?: string; assigneeName?: string }[] = [];
  if (viewer.userId) or.push({ assigneeId: viewer.userId });
  if (viewer.userName) or.push({ assigneeName: viewer.userName });

  const tasks = await prisma.metierTask.findMany({
    where: {
      status: { notIn: ['Terminée', 'Annulée'] },
      OR: or,
    },
    orderBy: [{ priorite: 'asc' }, { dueDate: 'asc' }, { createdAt: 'asc' }],
    take: 16,
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      priorite: true,
      dueDate: true,
      timerStatus: true,
      extraMin: true,
      delayMotif: true,
      commande: { select: { numero: true, article: true } },
    },
  }).catch(() => []);

  return [...tasks]
    .sort((a, b) => rankPosteTickerTask(a) - rankPosteTickerTask(b))
    .map((t) => formatPosteTickerAlert(t, viewer.role));
}

/** Compteurs direction / GPAO (pas les messages « tous »). */
async function getOperationalTickerAlerts(): Promise<TickerAlert[]> {
  const now = new Date();
  const weekAhead = new Date(now);
  weekAhead.setDate(weekAhead.getDate() + 7);

  const done = completedCommandeStatuts();
  const [
    cmdRetard,
    cmdUrgentes,
    facturesEnRetard,
    devisPending,
    proofsPending,
    stockAlerts,
    reclamationsOuvertes,
    machines,
    tasksBlocked,
    delayDeclared,
    syncDriftAlerts,
  ] = await Promise.all([
    prisma.commande.count({
      where: {
        OR: [
          { priorite: 'Urgente', statut: { notIn: done } },
          { statut: commandeRetardStatut() },
          { dateLiv: { lt: now }, statut: { notIn: done } },
        ],
      },
    }).catch(() => 0),
    prisma.commande.count({
      where: { priorite: 'Urgente', statut: { notIn: done } },
    }).catch(() => 0),
    prisma.facture.count({
      where: {
        statut: { in: unpaidFactureStatuts() },
        dateEcheance: { lt: now },
      },
    }).catch(() => 0),
    prisma.devis.count({ where: { statut: { in: pendingDevisStatuts() } } }).catch(() => 0),
    prisma.proof.count({ where: { statut: { in: ['En attente', 'Envoyé'] } } }).catch(() => 0),
    getStockAlerts().catch(() => []),
    prisma.clientReclamation.count({
      where: { statut: { in: ['Ouverte', 'En cours'] } },
    }).catch(() => 0),
    prisma.machine.findMany({
      where: {
        OR: [
          { status: { in: ['down', 'maintenance'] } },
          { nextMaintenance: { lte: weekAhead } },
        ],
      },
      select: { id: true, code: true, name: true, status: true, nextMaintenance: true },
      take: 20,
    }).catch(() => []),
    prisma.metierTask.count({ where: { status: 'Bloquée' } }).catch(() => 0),
    prisma.metierTask.count({
      where: {
        extraMin: { gt: 0 },
        delayDeclaredAt: { gte: startOfBusinessDay(new Date()) },
      },
    }).catch(() => 0),
    getSyncDriftTickerAlerts().catch(() => []),
  ]);

  const stockCritique = stockAlerts.length;

  const machinesDown = machines.filter((m) => m.status === 'down');
  const machinesMaint = machines.filter((m) =>
    m.status === 'maintenance' ||
    (m.nextMaintenance && m.nextMaintenance <= weekAhead),
  );

  const raw: Omit<TickerAlert, 'id' | 'severity'>[] = [
    ...(cmdRetard > 0 ? [{ type: 'retard', label: `${cmdRetard} commande(s) en retard ou urgente(s)`, href: '/commandes' }] : []),
    ...(cmdUrgentes > 0 ? [{ type: 'urgent', label: `${cmdUrgentes} commande(s) priorité urgente`, href: '/commandes' }] : []),
    ...(facturesEnRetard > 0 ? [{ type: 'facture', label: `${facturesEnRetard} facture(s) échue(s)`, href: '/factures' }] : []),
    ...(devisPending > 0 ? [{ type: 'devis', label: `${devisPending} devis en attente`, href: '/devis' }] : []),
    ...(proofsPending > 0 ? [{ type: 'bat', label: `${proofsPending} BAT en attente de validation`, href: '/bat' }] : []),
    ...(stockCritique > 0 ? [{ type: 'stock', label: `${stockCritique} article(s) stock critique`, href: '/stock?critical=1' }] : []),
    ...(reclamationsOuvertes > 0 ? [{ type: 'reclamation', label: `${reclamationsOuvertes} réclamation(s) client ouverte(s)`, href: '/clients' }] : []),
    ...(tasksBlocked > 0 ? [{ type: 'task-blocked', label: `${tasksBlocked} tâche(s) bloquée(s)`, href: '/equipe/taches?status=Bloquée' }] : []),
    ...(delayDeclared > 0 ? [{ type: 'retard-prod', label: `${delayDeclared} retard(s) prod à replanifier (Gantt)`, href: '/planning' }] : []),
    ...machinesDown.map((m) => ({
      type: 'machine-down',
      label: `Tous · Machine hors service : ${m.name}`,
      href: '/machines',
    })),
    ...machinesMaint
      .filter((m) => m.status !== 'down')
      .slice(0, 2)
      .map((m) => ({
        type: 'maintenance',
        label: `Maintenance : ${m.name}`,
        href: '/machines',
      })),
    ...syncDriftAlerts.map((a) => ({
      type: a.severity === 'critical' ? 'sync-drift-critical' : 'sync-drift',
      label: a.label,
      href: a.href,
    })),
  ];

  return raw.map((a, i) => ({
    id: `${a.type}-${i}`,
    ...a,
    severity: severityForType(a.type),
  }));
}

/** Alertes bandeau — tâches du poste + messages pour tous + ops (direction). */
export async function getTickerAlerts(viewer?: TickerViewer): Promise<TickerAlert[]> {
  const [mine, broadcast, ops] = await Promise.all([
    getMinePosteTickerAlerts(viewer),
    getBroadcastTickerAlerts(),
    getOperationalTickerAlerts(),
  ]);

  const isLead = !viewer?.role || viewer.role === 'admin' || viewer.role === 'manager';
  const opsVisible = isLead ? ops : ops.filter((a) => a.type === 'machine-down');
  const merged = [...mine, ...broadcast, ...opsVisible];

  if (merged.length === 0) {
    return [{
      id: 'ok',
      type: 'info',
      label: 'Aucune alerte — poste à jour',
      href: '/dashboard',
      severity: 'info',
    }];
  }
  return merged;
}

/** KPIs direction complémentaires */
export async function getDirectorKpis() {
  const now = new Date();

  const [reclamationsOuvertes, machinesDown, machinesMaintSoon, cmdAPlanifier, proofsPending] = await Promise.all([
    prisma.clientReclamation.count({
      where: { statut: { in: ['Ouverte', 'En cours'] } },
    }).catch(() => 0),
    prisma.machine.count({ where: { status: 'down' } }).catch(() => 0),
    prisma.machine.count({
      where: {
        OR: [
          { status: 'maintenance' },
          { nextMaintenance: { lte: new Date(now.getTime() + 7 * 86400000) } },
        ],
      },
    }).catch(() => 0),
    prisma.commande.count({
      where: { statut: { in: planifierCommandeStatuts() } },
    }),
    prisma.proof.count({ where: { statut: { in: ['En attente', 'Envoyé'] } } }).catch(() => 0),
  ]);

  return { reclamationsOuvertes, machinesDown, machinesMaintSoon, cmdAPlanifier, batEnAttente: proofsPending };
}
