export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { resolveParams } from '@/lib/api/route-params';

export async function GET(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('devis:read');
  if ('error' in auth) return auth.error;

  const devis = await prisma.devis.findUnique({ where: { id: id }, select: { id: true, numero: true } });
  if (!devis) return apiError('Devis introuvable', 404);

  const logs = await prisma.auditLog.findMany({
    where: {
      entity: 'Devis',
      entityId: id,
      action: { in: ['CREATE', 'UPDATE', 'VERSION_SNAPSHOT', 'EMAIL_SENT', 'ACCEPT'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const versions = logs.map((log) => {
    let details: Record<string, unknown> = {};
    if (log.details) {
      try {
        details = JSON.parse(log.details);
      } catch {
        details = { raw: log.details };
      }
    }
    return {
      id: log.id,
      action: log.action,
      userName: log.userName,
      createdAt: log.createdAt,
      summary: summarizeVersion(log.action, details),
      snapshot: details.snapshot ?? details.newValue ?? null,
    };
  });

  return NextResponse.json({ devisId: id, numero: devis.numero, versions });
}

function summarizeVersion(action: string, details: Record<string, unknown>): string {
  if (action === 'EMAIL_SENT') return `Email envoyé à ${details.to ?? 'client'}`;
  if (action === 'CREATE') return 'Création du devis';
  if (action === 'ACCEPT') return 'Devis accepté';
  if (details.statut) return `Statut → ${details.statut}`;
  if (details.snapshot && typeof details.snapshot === 'object') {
    const s = details.snapshot as Record<string, unknown>;
    if (s.totalTTC != null) return `Snapshot — ${Number(s.totalTTC).toLocaleString('fr-FR')} Ar TTC`;
  }
  return 'Modification enregistrée';
}
