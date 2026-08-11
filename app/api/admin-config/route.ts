export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import type { AdminConfigSnapshot } from '@/lib/admin-config/types';
import { adminConfigSnapshotSchema } from '@/lib/validators/admin-config';
import {
  getDraftConfig,
  getPublishedConfig,
  saveDraftConfig,
} from '@/lib/services/admin-config';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  const mode = new URL(req.url).searchParams.get('mode') || 'draft';
  const config = mode === 'published' ? await getPublishedConfig() : await getDraftConfig();
  return NextResponse.json(config);
}

export async function PUT(req: NextRequest) {
  const auth = await requirePermission('config:edit_chips');
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseBody(adminConfigSnapshotSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const saved = await saveDraftConfig(parsed.data as AdminConfigSnapshot, auth.userId, auth.userName);
    return NextResponse.json(saved);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Erreur sauvegarde', 500);
  }
}
