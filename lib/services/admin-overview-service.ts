import { prisma } from '@/lib/prisma';
import { getRhStats } from '@/lib/services/rh-service';
import { getStockAlerts } from '@/lib/services/stock-service';
import { getDirectorKpis } from '@/lib/services/ops-alerts';
import { commandeRetardStatut, completedCommandeStatuts } from '@/lib/server/data/prisma-statut-bridge';

export async function getAdminOverview() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    rhStats,
    stockAlerts,
    directorKpis,
    employees,
    absencesPending,
    proofsPending,
    machinesMaint,
    recentMessages,
    recentSuggestions,
  ] = await Promise.all([
    getRhStats(),
    getStockAlerts().catch(() => []),
    getDirectorKpis().catch(() => ({
      reclamationsOuvertes: 0,
      machinesDown: 0,
      machinesMaintSoon: 0,
      cmdAPlanifier: 0,
      batEnAttente: 0,
    })),
    prisma.employee.findMany({
      where: { statut: 'Actif' },
      include: { presences: { where: { date: { gte: todayStart } }, take: 1 } },
      orderBy: { lastName: 'asc' },
      take: 50,
    }),
    prisma.employeeAbsence.count({ where: { statut: 'En attente' } }),
    prisma.proof.count({ where: { statut: { in: ['En attente', 'Envoyé'] } } }).catch(() => 0),
    prisma.machine.count({
      where: {
        OR: [
          { status: 'maintenance' },
          { nextMaintenance: { lte: new Date(now.getTime() + 86400000) } },
        ],
      },
    }).catch(() => 0),
    prisma.teamMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }).catch(() => []),
    prisma.teamSuggestion.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }).catch(() => []),
  ]);

  const cmdRetard = await prisma.commande.count({
    where: {
      OR: [{ statut: commandeRetardStatut() }, { dateLiv: { lt: now }, statut: { notIn: [...completedCommandeStatuts()] } }],
    },
  });

  const presenceRows = employees.map((e) => {
    const p = e.presences[0];
    return {
      id: e.id,
      name: `${e.firstName} ${e.lastName}`,
      poste: e.poste,
      station: e.station ?? e.departement,
      presenceStatut: e.presenceStatut,
      checkIn: p?.checkIn?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) ?? '—',
      statut: p?.statut ?? e.presenceStatut,
    };
  });

  const presentCount = employees.filter((e) => e.presenceStatut === 'Présent').length;
  const pauseCount = employees.filter((e) => e.presenceStatut === 'En pause').length;
  const absentCount = employees.filter((e) => e.presenceStatut === 'Absent').length;

  return {
    urgentCards: [
      {
        id: 'bat',
        icon: '⚠',
        label: 'URGENT',
        title: proofsPending > 0 ? `${proofsPending} BAT en attente` : 'Validation BAT',
        desc: 'Le client attend le retour pour lancer l\'impression.',
        href: '/bat',
        color: 'red',
      },
      {
        id: 'rh',
        icon: '📋',
        label: 'RH',
        title: `${absencesPending} demande(s) de congés`,
        desc: 'À traiter sous 48h.',
        href: '/rh/absences',
        color: 'blue',
      },
      {
        id: 'prod',
        icon: '⚙',
        label: 'PROD',
        title: machinesMaint > 0 ? `${machinesMaint} maintenance(s) prévue(s)` : 'Maintenance atelier',
        desc: 'Révision machines — voir parc matériel.',
        href: '/machines',
        color: 'green',
      },
    ],
    presence: { presentCount, pauseCount, absentCount, rows: presenceRows },
    stockPriorities: stockAlerts.slice(0, 5).map((s) => ({
      name: s.label,
      level: s.quantity <= 0 ? 'RUPTURE' : 'CRITIQUE',
    })),
    kpis: {
      cmdRetard,
      machinesDown: directorKpis.machinesDown,
      absencesPending,
      proofsPending,
      totalActifs: rhStats?.totalActifs ?? employees.length,
    },
    messages: recentMessages,
    suggestions: recentSuggestions,
  };
}
