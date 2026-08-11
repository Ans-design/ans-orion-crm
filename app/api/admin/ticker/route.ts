export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { z } from 'zod';
import { created } from '@/lib/server/http/api-response';
import {
  createTickerMessage,
  deleteTickerMessage,
  listTickerMessages,
  updateTickerMessage,
} from '@/lib/services/ticker-admin-service';

const createSchema = z.object({
  text: z.string().min(3).max(500),
  priority: z.enum(['normal', 'warn', 'critical', 'info']).optional(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(3).max(500).optional(),
  active: z.boolean().optional(),
  priority: z.string().optional(),
});

export async function GET() {
  const auth = await requirePermission('commandes:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin/ticker GET', async () => {
    const messages = await listTickerMessages();
    return NextResponse.json({ messages });
  }, { fallbackResponse: { messages: [] } });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('settings:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin/ticker POST', async (): Promise<Response> => {
    const parsed = parseBody(createSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);
    const msg = await createTickerMessage(parsed.data.text, parsed.data.priority ?? 'normal');
    return created(msg);
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePermission('settings:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin/ticker PATCH', async (): Promise<Response> => {
    const parsed = parseBody(patchSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);
    const { id, ...data } = parsed.data;
    return NextResponse.json(await updateTickerMessage(id, data));
  });
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePermission('settings:write');
  if ('error' in auth) return auth.error;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return apiError('id requis', 400);

  return runApiHandler('admin/ticker DELETE', async () => {
    await deleteTickerMessage(id);
    return NextResponse.json({ ok: true });
  });
}
