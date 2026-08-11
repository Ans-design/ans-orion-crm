import { prisma } from '@/lib/prisma';
import { commandeRetardStatut, completedCommandeStatuts } from '@/lib/server/data/prisma-statut-bridge';
import { getRhStats } from '@/lib/services/rh-service';
import { getStockAlerts } from '@/lib/services/stock-service';
import { getDirectorKpis } from '@/lib/services/ops-alerts';
import { hasPermission } from '@/lib/auth/permissions';

export type DrawerNotif = {
  id: string;
  category: string;
  icon: string;
  title: string;
  message: string;
  href: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  createdAt: string;
  /** active_alert = ops ; personal = inbox receipt */
  kind: 'active_alert' | 'personal';
};

function formatMga(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  return `${amount.toLocaleString('fr-FR')} Ar`;
}

/**
 * Sépare alertes actives (ops) et inbox personnelle (receipts).
 * Montants en MGA (Ar) — P0-35.
 */
export async function getNotificationDrawerItems(
  userId?: string,
  role?: string,
): Promise<{
  items: DrawerNotif[];
  unreadCount: number;
  activeAlerts: DrawerNotif[];
  personal: DrawerNotif[];
  quality: 'OK' | 'PARTIAL' | 'ERROR';
  partialReasons: string[];
}> {
  const now = new Date();
  const activeAlerts: DrawerNotif[] = [];
  const partialReasons: string[] = [];
  let quality: 'OK' | 'PARTIAL' | 'ERROR' = 'OK';

  const wrap = async <T>(label: string, p: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await p;
    } catch {
      partialReasons.push(label);
      quality = 'PARTIAL';
      return fallback;
    }
  };

  const [
    rhStats,
    stockAlerts,
    directorKpis,
    absencesPending,
    proofsPending,
    machinesMaint,
    machinesDown,
    recentPaiements,
    cmdRetard,
  ] = await Promise.all([
    wrap('rh', getRhStats(), null),
    wrap('stock', getStockAlerts(), [] as Awaited<ReturnType<typeof getStockAlerts>>),
    wrap('director', getDirectorKpis(), {
      reclamationsOuvertes: 0,
      machinesDown: 0,
      machinesMaintSoon: 0,
      cmdAPlanifier: 0,
      batEnAttente: 0,
    }),
    wrap('absences', prisma.employeeAbsence.count({ where: { statut: 'En attente' } }), 0),
    wrap('proofs', prisma.proof.count({ where: { statut: { in: ['En attente', 'Envoyé'] } } }), 0),
    wrap(
      'maint',
      prisma.machine.count({
        where: { OR: [{ status: 'maintenance' }, { nextMaintenance: { lte: new Date(now.getTime() + 86400000) } }] },
      }),
      0,
    ),
    wrap('down', prisma.machine.count({ where: { status: 'down' } }), 0),
    wrap('paiements', prisma.paiement.findMany({ orderBy: { createdAt: 'desc' }, take: 3 }), [] as { id: string; montant: number | null; type: string | null; mode: string | null; createdAt: Date }[]),
    wrap(
      'retard',
      prisma.commande.count({
        where: {
          OR: [
            { statut: commandeRetardStatut() },
            { dateLiv: { lt: now }, statut: { notIn: [...completedCommandeStatuts()] } },
          ],
        },
      }),
      0,
    ),
  ]);

  void rhStats;

  if (machinesDown > 0) {
    activeAlerts.push({
      id: 'mach-down',
      category: 'Machines',
      icon: '🔴',
      title: `${machinesDown} machine(s) en panne`,
      message: 'Intervention atelier requise',
      href: '/machines',
      severity: 'critical',
      createdAt: now.toISOString(),
      kind: 'active_alert',
    });
  }
  if (machinesMaint > 0) {
    activeAlerts.push({
      id: 'mach-maint',
      category: 'Machines',
      icon: '🔧',
      title: `${machinesMaint} maintenance(s)`,
      message: 'Révisions planifiées ou en cours',
      href: '/machines',
      severity: 'warning',
      createdAt: now.toISOString(),
      kind: 'active_alert',
    });
  }
  if (absencesPending > 0) {
    activeAlerts.push({
      id: 'rh-abs',
      category: 'RH',
      icon: '👤',
      title: `${absencesPending} absence(s) en attente`,
      message: 'Validation RH requise',
      href: '/rh',
      severity: 'warning',
      createdAt: now.toISOString(),
      kind: 'active_alert',
    });
  }

  const canSeePayments = !role || hasPermission(role, 'paiements:read') || hasPermission(role, 'finance:read');
  if (canSeePayments) {
    for (const p of recentPaiements) {
      activeAlerts.push({
        id: `pay-${p.id}`,
        category: 'Paiements',
        icon: '💰',
        title: `Paiement ${formatMga(p.montant)}`,
        message: p.type ?? p.mode ?? 'Mise à jour trésorerie',
        href: '/paiements',
        severity: 'success',
        createdAt: p.createdAt.toISOString(),
        kind: 'active_alert',
      });
    }
  }

  if (stockAlerts.length > 0) {
    const s = stockAlerts[0];
    activeAlerts.push({
      id: 'stock-rupture',
      category: 'Stocks',
      icon: '📦',
      title: `Rupture : ${s.label}`,
      message: `Quantité : ${s.quantity}`,
      href: '/stock?critical=1',
      severity: 'critical',
      createdAt: now.toISOString(),
      kind: 'active_alert',
    });
  }
  if (proofsPending > 0) {
    activeAlerts.push({
      id: 'bat-pending',
      category: 'Production',
      icon: '🎨',
      title: `${proofsPending} BAT en attente`,
      message: 'Validation client requise',
      href: '/bat',
      severity: 'warning',
      createdAt: now.toISOString(),
      kind: 'active_alert',
    });
  }
  if (cmdRetard > 0) {
    activeAlerts.push({
      id: 'planning-delay',
      category: 'Planning',
      icon: '📅',
      title: `${cmdRetard} commande(s) en retard`,
      message: 'Planning Gantt à réviser',
      href: '/planning',
      severity: 'critical',
      createdAt: now.toISOString(),
      kind: 'active_alert',
    });
  }
  if (directorKpis.machinesDown > 0 && !activeAlerts.some((i) => i.id === 'mach-down')) {
    activeAlerts.push({
      id: 'ops-alert',
      category: 'Opérations',
      icon: '⚡',
      title: 'Alertes opérations actives',
      message: 'Voir cockpit temps réel',
      href: '/operations',
      severity: 'warning',
      createdAt: now.toISOString(),
      kind: 'active_alert',
    });
  }

  const personal: DrawerNotif[] = [];
  if (userId) {
    const receipts = await wrap(
      'receipts',
      prisma.notificationReceipt.findMany({
        where: { userId, readAt: null, archivedAt: null },
        include: { notification: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      [],
    );
    for (const r of receipts) {
      personal.push({
        id: r.notification.id,
        category: r.notification.category ?? 'Système',
        icon: '🔔',
        title: r.notification.title,
        message: r.notification.message,
        href: r.notification.link ?? '/historique',
        severity: 'info',
        createdAt: r.notification.createdAt.toISOString(),
        kind: 'personal',
      });
    }
  }

  const items = [...activeAlerts, ...personal].slice(0, 12);
  return {
    items,
    unreadCount: personal.length + activeAlerts.filter((a) => a.severity === 'critical').length,
    activeAlerts,
    personal,
    quality,
    partialReasons,
  };
}
