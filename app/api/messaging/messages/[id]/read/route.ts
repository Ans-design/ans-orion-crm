export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireMessagingWrite } from '@/lib/messaging/route-auth';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { runApiHandler } from '@/lib/api-guard';
import { acknowledgeMessage } from '@/lib/server/modules/messaging/message-read.service';
import { resolveParams } from '@/lib/api/route-params';

export async function POST(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireMessagingWrite();
  if ('error' in auth) return auth.error;

  return runApiHandler('messaging message read POST', async () => {
    const read = await acknowledgeMessage(id, auth.userId);
    return NextResponse.json(read);
  });
}
