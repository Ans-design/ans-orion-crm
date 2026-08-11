export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { voteTeamSuggestion } from '@/lib/services/team-communication-service';
import { resolveParams } from '@/lib/api/route-params';

export async function POST(
  _req: Request,
  ctx: { params: { id: string } | Promise<{ id: string }> },
) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const suggestion = await voteTeamSuggestion(id);
    return NextResponse.json(suggestion);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur vote suggestion'), 500);
  }
}
