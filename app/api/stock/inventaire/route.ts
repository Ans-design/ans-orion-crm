export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAnyPermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { ok } from '@/lib/server/http/api-response';
import {
  applyPhysicalInventory,
  listInventaireCandidates,
} from '@/lib/services/stock-inventaire-service';

const postSchema = z.object({
  notes: z.string().max(500).optional(),
  lines: z
    .array(
      z.object({
        stockItemId: z.string().min(1),
        countedQty: z.number().min(0),
      }),
    )
    .min(1)
    .max(200),
});

export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('stock:read', 'production:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('stock inventaire GET', async () => {
    const limit = Number(req.nextUrl.searchParams.get('limit') || 200);
    const items = await listInventaireCandidates(limit);
    return ok({ items });
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAnyPermission('stock:write', 'production:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('stock inventaire POST', async (): Promise<Response> => {
    const parsed = parseBody(postSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const result = await applyPhysicalInventory({
      lines: parsed.data.lines,
      userId: auth.userId,
      userName: auth.userName,
      notes: parsed.data.notes,
    });

    if (result.adjusted === 0 && result.errors.length > 0) {
      return apiError(result.errors[0]?.error ?? 'Inventaire échoué', 400);
    }

    return NextResponse.json({ ok: true, data: result });
  });
}
