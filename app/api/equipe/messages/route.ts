export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireAnyPermission, requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { created } from '@/lib/server/http/api-response';
import {
  createTeamMessage,
  listTeamMessages,
  toggleMessagePin,
} from '@/lib/services/team-communication-service';

const createSchema = z.object({
  content: z.string().min(1).max(4000),
  pinned: z.boolean().optional(),
});

const pinSchema = z.object({
  id: z.string().min(1),
  pinned: z.boolean(),
});

export async function GET() {
  const auth = await requireAnyPermission('commandes:read', 'production:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('equipe/messages GET', async () => {
    return NextResponse.json(await listTeamMessages());
  }, { fallbackResponse: [] });
}

export async function POST(req: NextRequest) {
  // Mutation : session authentifiée (pas *:read seul — V2-01)
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  return runApiHandler('equipe/messages POST', async (): Promise<Response> => {
    const parsed = parseBody(createSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const { content, pinned } = parsed.data;
    const isManager = ['admin', 'manager'].includes(auth.role);

    const message = await createTeamMessage({
      authorId: auth.userId,
      authorName: auth.userName,
      authorRole: auth.role,
      content,
      pinned: isManager ? (pinned ?? false) : false,
    });
    return created(message);
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePermission('users:manage');
  if ('error' in auth) return auth.error;

  return runApiHandler('equipe/messages PATCH', async (): Promise<Response> => {
    const parsed = parseBody(pinSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const { id, pinned } = parsed.data;
    return NextResponse.json(await toggleMessagePin(id, pinned));
  });
}
