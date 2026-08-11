export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { requirePermission } from '@/lib/auth-utils';
import { parseBody } from '@/lib/validators/common';
import { accessRequestReviewSchema } from '@/lib/validators/access-request';
import { logAudit } from '@/lib/audit';
import { runApiHandler } from '@/lib/api-guard';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requirePermission('users:manage');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin/access-requests/[id] PATCH', async () => {
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = parseBody(accessRequestReviewSchema, body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const existing = await prisma.accessRequest.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    if (!['en_attente', 'envoye'].includes(existing.statut)) {
      return NextResponse.json({ error: 'Demande déjà traitée' }, { status: 409 });
    }

    const { statut, reviewNote, createUser, role } = parsed.data;
    let tempPassword: string | undefined;
    let userId: string | undefined;

    if (statut === 'accepte' && createUser) {
      const dup = await prisma.user.findUnique({ where: { email: existing.email } });
      if (dup) {
        userId = dup.id;
      } else {
        tempPassword = crypto.randomBytes(4).toString('hex') + 'A1!';
        const hashed = await bcrypt.hash(tempPassword, 12);
        const user = await prisma.user.create({
          data: {
            email: existing.email,
            password: hashed,
            name: existing.nom,
            role: role || 'commercial',
          },
        });
        userId = user.id;
        await logAudit({
          userId: auth.userId,
          userName: auth.userName,
          action: 'CREATE',
          entity: 'User',
          entityId: user.id,
          entityLabel: user.email,
          details: { fromAccessRequest: id, role: user.role },
        });
      }
    }

    const updated = await prisma.accessRequest.update({
      where: { id },
      data: {
        statut,
        reviewNote: reviewNote?.trim() || null,
        reviewedBy: auth.userName || auth.userId || 'admin',
        reviewedAt: new Date(),
        userId: userId ?? null,
      },
    });

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'UPDATE',
      entity: 'AccessRequest',
      entityId: id,
      entityLabel: existing.email,
      details: { statut, reviewNote },
    });

    return NextResponse.json({ request: updated, tempPassword });
  });
}
