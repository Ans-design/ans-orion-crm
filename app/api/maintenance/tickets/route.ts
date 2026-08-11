export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { createMaintenanceTicketSchema } from '@/lib/server/modules/maintenance/maintenance.validation';
import { created } from '@/lib/server/http/api-response';

async function nextTicketNumero() {
  const count = await prisma.maintenanceTicket.count();
  return `TKT-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission('production:read');
  if ('error' in auth) return auth.error;

  const statut = req.nextUrl.searchParams.get('statut');
  const priorite = req.nextUrl.searchParams.get('priorite');
  const take = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get('limit') || 100) || 100));

  const tickets = await prisma.maintenanceTicket.findMany({
    where: {
      ...(statut ? { statut } : {}),
      ...(priorite ? { priorite } : {}),
    },
    include: {
      machine: { select: { id: true, code: true, name: true, status: true } },
      equipment: { select: { id: true, code: true, name: true, category: true } },
      assignee: { select: { id: true, matricule: true, firstName: true, lastName: true } },
    },
    orderBy: [{ priorite: 'desc' }, { createdAt: 'desc' }],
    take,
  });

  return NextResponse.json({
    tickets,
    stats: {
      ouverts: tickets.filter((t) => ['Ouvert', 'En cours', 'En attente pièce'].includes(t.statut)).length,
      urgents: tickets.filter((t) => t.priorite === 'Urgente').length,
      impactPlanning: tickets.filter((t) => t.impactPlanning && !['Résolu', 'Clôturé'].includes(t.statut)).length,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('production:write');
  if ('error' in auth) return auth.error;

  const parsed = parseBody(createMaintenanceTicketSchema, await req.json());
  if (!parsed.ok) return apiError(parsed.error, 400);

  try {
    const body = parsed.data;
    const ticket = await prisma.maintenanceTicket.create({
      data: {
        numero: await nextTicketNumero(),
        titre: body.titre,
        type: body.type ?? 'panne',
        priorite: body.priorite ?? 'Normale',
        description: body.description,
        machineId: body.machineId,
        equipmentId: body.equipmentId,
        impactPlanning: body.impactPlanning ?? false,
        reportedBy: auth.userName,
      },
      include: { machine: true, equipment: true },
    });

    if (body.machineId) {
      await prisma.machine.update({ where: { id: body.machineId }, data: { status: 'down' } });
    }
    if (body.equipmentId) {
      await prisma.equipment.update({ where: { id: body.equipmentId }, data: { etat: 'panne' } });
    }

    if (body.priorite === 'Urgente' || body.impactPlanning) {
      const { createNotification } = await import('@/lib/services/notification-service');
      await createNotification({
        title: 'Maintenance urgente',
        message: `${ticket.numero} — ${ticket.titre}${body.impactPlanning ? ' (impact planning)' : ''}`,
        link: '/maintenance/tickets',
        type: 'warning',
        category: 'production',
      }).catch(() => {});
    }

    return created(ticket);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur création ticket'), 500);
  }
}
