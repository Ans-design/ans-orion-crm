export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/server/http/errors';
import { ok } from '@/lib/server/http/api-response';
import { withAuthApi, type AuthApiContext } from '@/lib/server/auth/with-auth-api';
import { computeSessionTotals, getOpenSession } from '@/lib/services/cash-session';
import { logPosAudit } from '@/lib/pos-audit';
import { parseBody } from '@/lib/server/validation/common';
import { z } from 'zod';

const closeCaisseSchema = z.object({
  closingCash: z.coerce.number().finite(),
  notes: z.string().max(2000).optional().nullable(),
});

async function handleClose(auth: AuthApiContext, body: unknown) {
  const session = await getOpenSession(auth.userId);
  if (!session) throw ApiError.notFound('Aucune session caisse ouverte');

  const parsed = parseBody(closeCaisseSchema, body, 'caisse/close POST');
  if (!parsed.ok) return parsed.response;
  const { closingCash, notes } = parsed.data;

  const totals = await computeSessionTotals(auth.userId, session.openedAt, session.id);
  const expectedCash = session.openingFloat + (totals.especes || 0);
  const variance = closingCash - expectedCash;

  const closed = await prisma.cashSession.update({
    where: { id: session.id },
    data: {
      status: 'closed',
      closedAt: new Date(),
      closingCash,
      expectedCash,
      variance,
      totalsJson: JSON.stringify(totals),
      notes: notes || null,
    },
  });

  await logPosAudit({
    userId: auth.userId,
    userName: auth.userName,
    action: 'CASH_CLOSE',
    entity: 'Caisse',
    entityId: closed.id,
    entityLabel: `Écart ${variance.toFixed(0)} Ar`,
    details: { closingCash, expectedCash, variance, totals },
  });

  return ok(closed);
}

export async function POST(req: NextRequest) {
  return withAuthApi(
    'caisse/close POST',
    async (auth, request) => handleClose(auth, await request.json()),
    { permission: 'pos:close_register' },
  )(req);
}
