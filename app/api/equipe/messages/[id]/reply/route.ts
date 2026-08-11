export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseOr400 } from '@/lib/validators/parse';
import { replyToTeamMessage } from '@/lib/services/team-communication-service';
import { resolveParams } from '@/lib/api/route-params';
import { created } from '@/lib/server/http/api-response';

const replySchema = z.object({
  content: z.string().min(1).max(2000),
});

export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } | Promise<{ id: string }> },
) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseOr400(replySchema, await req.json());
    if ('error' in parsed) return parsed.error;

    const reply = await replyToTeamMessage(id, {
      authorId: auth.userId,
      authorName: auth.userName,
      content: parsed.data.content,
    });
    return created(reply);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur réponse message'), 500);
  }
}
