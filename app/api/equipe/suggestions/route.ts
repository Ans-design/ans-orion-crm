export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireAnyPermission, requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseOr400 } from '@/lib/validators/parse';
import { SUGGESTION_STATUSES } from '@/lib/constants/team-communication';
import { created } from '@/lib/server/http/api-response';
import {
  createTeamSuggestion,
  listTeamSuggestions,
  updateTeamSuggestion,
} from '@/lib/services/team-communication-service';

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(4000),
});

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(SUGGESTION_STATUSES).optional(),
});

export async function GET() {
  const auth = await requireAnyPermission('commandes:read', 'production:read');
  if ('error' in auth) return auth.error;

  try {
    const suggestions = await listTeamSuggestions();
    return NextResponse.json(suggestions);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur chargement suggestions'), 500);
  }
}

export async function POST(req: NextRequest) {
  // Mutation : session authentifiée (pas *:read seul — V2-01)
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseOr400(createSchema, await req.json());
    if ('error' in parsed) return parsed.error;

    const { title, content } = parsed.data;
    const suggestion = await createTeamSuggestion({
      authorId: auth.userId,
      authorName: auth.userName,
      title,
      content,
    });
    return created(suggestion);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur création suggestion'), 500);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePermission('users:manage');
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseOr400(updateSchema, await req.json());
    if ('error' in parsed) return parsed.error;

    const { id, status } = parsed.data;
    const suggestion = await updateTeamSuggestion(id, { status });
    return created(suggestion);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur mise à jour suggestion'), 500);
  }
}
