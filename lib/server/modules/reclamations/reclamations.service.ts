import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/server/http/api-error';
import { recordReclamationEmployeeImpact } from '@/lib/services/employee-impact-service';

export type ReclamationListQuery = {
  clientId?: string;
  commandeId?: string;
  statut?: string;
  statsOnly?: boolean;
  page?: number;
  pageSize?: number;
  trash?: boolean;
};

export type CreateReclamationInput = {
  clientId: string;
  subject: string;
  description?: string | null;
  priorite?: 'Basse' | 'Normale' | 'Haute' | 'Urgente';
  commandeId?: string | null;
  /** Employé ciblé — sinon tous les intervenants de la commande. */
  employeeId?: string | null;
};

const MAX_PAGE_SIZE = 50;

export async function getReclamationStats() {
  const [ouvertes, urgentes] = await Promise.all([
    prisma.clientReclamation.count({
      where: { statut: { in: ['Ouverte', 'En cours'] } },
    }),
    prisma.clientReclamation.count({
      where: { priorite: 'Urgente', statut: { in: ['Ouverte', 'En cours'] } },
    }),
  ]);
  return { ouvertes, urgentes };
}

export async function listReclamations(query: ReclamationListQuery) {
  if (query.statsOnly) return getReclamationStats();

  const pageSize = Math.min(Math.max(query.pageSize ?? 25, 1), MAX_PAGE_SIZE);
  const page = Math.max(query.page ?? 1, 1);
  const where: Record<string, unknown> = {
    archived: query.trash === true,
  };
  if (query.clientId) where.clientId = query.clientId;
  if (query.commandeId) where.commandeId = query.commandeId;
  if (query.statut && query.statut !== 'tous') where.statut = query.statut;

  const includeFull = {
    client: { select: { id: true, name: true, code: true, statut: true } },
    commande: { select: { id: true, numero: true } },
    employee: { select: { id: true, firstName: true, lastName: true, poste: true } },
  } as const;

  const includeLegacy = {
    client: { select: { id: true, name: true, code: true, statut: true } },
  } as const;

  try {
    const [items, total] = await Promise.all([
      prisma.clientReclamation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: includeFull,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.clientReclamation.count({ where }),
    ]);
    return { items, total, page, pageSize };
  } catch (err) {
    /* DB locale sans migration commandeId/employeeId — fallback léger */
    const msg = err instanceof Error ? err.message : '';
    if (
      !msg.includes('commandeId')
      && !msg.includes('employeeId')
      && !msg.includes('does not exist')
      && !msg.includes('Unknown field')
    ) {
      throw err;
    }

    const whereLegacy = { ...where };
    delete whereLegacy.commandeId;

    const [items, total] = await Promise.all([
      prisma.clientReclamation.findMany({
        where: whereLegacy,
        orderBy: { createdAt: 'desc' },
        include: includeLegacy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.clientReclamation.count({ where: whereLegacy }),
    ]);

    return {
      items: items.map((row) => ({ ...row, commande: null, employee: null })),
      total,
      page,
      pageSize,
    };
  }
}

async function assertCommandeBelongsToClient(commandeId: string, clientId: string) {
  const cmd = await prisma.commande.findUnique({
    where: { id: commandeId },
    select: { id: true, clientId: true },
  });
  if (!cmd) throw ApiError.badRequest('Commande introuvable');
  if (cmd.clientId && cmd.clientId !== clientId) {
    throw ApiError.badRequest('La commande n’appartient pas à ce client');
  }
}

export async function createReclamationRecord(input: CreateReclamationInput) {
  if (input.commandeId) {
    await assertCommandeBelongsToClient(input.commandeId, input.clientId);
  }
  if (input.employeeId) {
    const emp = await prisma.employee.findUnique({
      where: { id: input.employeeId },
      select: { id: true },
    });
    if (!emp) throw ApiError.badRequest('Employé introuvable');
  }

  const reclamation = await prisma.clientReclamation.create({
    data: {
      clientId: input.clientId,
      commandeId: input.commandeId || null,
      employeeId: input.employeeId || null,
      subject: input.subject.trim(),
      description: input.description?.trim() || null,
      priorite: input.priorite ?? 'Normale',
    },
    include: {
      client: { select: { id: true, name: true, code: true } },
      commande: { select: { id: true, numero: true } },
      employee: { select: { id: true, firstName: true, lastName: true, poste: true } },
    },
  });

  await recordReclamationEmployeeImpact({
    reclamationId: reclamation.id,
    subject: reclamation.subject,
    description: reclamation.description,
    priorite: reclamation.priorite,
    employeeId: reclamation.employeeId,
    commandeId: reclamation.commandeId,
    commandeNumero: reclamation.commande?.numero ?? null,
  }).catch(() => {});

  return reclamation;
}
