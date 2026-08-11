export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseOr400 } from '@/lib/validators/parse';
import { created } from '@/lib/server/http/api-response';
import {
  getNotificationStats,
  getPendingClientNotifications,
  listNotificationHistory,
  logClientNotification,
} from '@/lib/services/client-notification-service';
import { prisma } from '@/lib/prisma';

const sendSchema = z.object({
  commandeId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  clientName: z.string().optional(),
  type: z.string().default('manual'),
  canal: z.string().default('WhatsApp'),
  message: z.string().min(1).max(2000),
  /** Preuve envoi assisté (manuel) — statut ASSISTE si pas de connecteur. */
  assisted: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requirePermission('cm:read');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  try {
    if (searchParams.get('history') === '1') {
      const history = await listNotificationHistory();
      return NextResponse.json({ history });
    }
    const [pending, stats] = await Promise.all([
      getPendingClientNotifications(),
      getNotificationStats(),
    ]);
    const clients = await prisma.client.findMany({
      where: { archived: false },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 200,
    });
    return NextResponse.json({ pending, stats, clients });
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur notifications clients'), 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('cm:write');
  if ('error' in auth) return auth.error;
  const { userId, userName } = auth;

  const parsed = parseOr400(sendSchema, await req.json());
  if ('error' in parsed) return parsed.error;

  const sentBy = userName ?? userId;

  try {
    let clientId = parsed.data.clientId;
    if (!clientId && parsed.data.clientName) {
      const c = await prisma.client.findFirst({
        where: { name: parsed.data.clientName },
        select: { id: true },
      });
      clientId = c?.id ?? null;
    }
    const log = await logClientNotification({
      clientId,
      commandeId: parsed.data.commandeId,
      type: parsed.data.type,
      canal: parsed.data.canal,
      message: parsed.data.message,
      sentBy,
      assisted: parsed.data.assisted === true,
    });
    return created(log);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur envoi notification'), 500);
  }
}
