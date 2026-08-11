export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/server/http/errors';
import { created, ok } from '@/lib/server/http/api-response';
import { withAuthApi, type AuthApiContext } from '@/lib/server/auth/with-auth-api';
import { computeSessionTotals, getOpenSession, listCashSessionHistory, summarizeCashHistory } from '@/lib/services/cash-session';
import { logPosAudit } from '@/lib/pos-audit';
import { parseBody } from '@/lib/server/validation/common';
import { openCaisseSessionSchema } from '@/lib/validators/admin-config';

async function handleGet(auth: AuthApiContext) {
  const [session, history] = await Promise.all([
    getOpenSession(auth.userId),
    listCashSessionHistory({ userId: auth.userId, role: auth.role, days: 30, take: 40 }),
  ]);
  const historySummary = summarizeCashHistory(history);
  if (!session) {
    return ok({ session: null, totals: null, history, historySummary });
  }
  const totals = await computeSessionTotals(auth.userId, session.openedAt, session.id);
  return ok({ session, totals, history, historySummary });
}

async function handlePost(auth: AuthApiContext, body: unknown) {
  const existing = await getOpenSession(auth.userId);
  if (existing) throw ApiError.conflict('Une session caisse est déjà ouverte');

  const parsed = parseBody(openCaisseSessionSchema, body ?? {}, 'caisse/session POST');
  if (!parsed.ok) return parsed.response;
  const { openingFloat } = parsed.data;

  const session = await prisma.cashSession.create({
    data: {
      userId: auth.userId,
      userName: auth.userName || null,
      openingFloat,
      status: 'open',
    },
  });

  await logPosAudit({
    userId: auth.userId,
    userName: auth.userName,
    action: 'CASH_OPEN',
    entity: 'Caisse',
    entityId: session.id,
    entityLabel: auth.userName || auth.userId,
    details: { openingFloat },
  });

  return created(session);
}

export const GET = withAuthApi(
  'caisse/session GET',
  handleGet,
  { permission: 'pos:use' },
);

export async function POST(req: NextRequest) {
  return withAuthApi(
    'caisse/session POST',
    async (auth, request) => handlePost(auth, await request.json().catch(() => ({}))),
    { permission: 'pos:close_register' },
  )(req);
}
