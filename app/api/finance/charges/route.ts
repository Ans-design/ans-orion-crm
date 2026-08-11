export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { parseBody } from '@/lib/validators/common';
import { withAuthApi, type AuthApiContext } from '@/lib/server/auth/with-auth-api';
import { ApiError } from '@/lib/server/http/api-error';
import { created, ok } from '@/lib/server/http/api-response';
import { createFinanceCharge, getFinanceAdvStats, listFinanceCharges } from '@/lib/services/finance-adv-service';

const createSchema = z.object({
  label: z.string().min(1).max(200),
  category: z.string().optional(),
  amount: z.number().positive(),
  dateCharge: z.string().optional(),
  supplierRef: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

async function handleGet(_auth: AuthApiContext, req: NextRequest) {
  if (req.nextUrl.searchParams.get('stats') === '1') {
    return ok(await getFinanceAdvStats());
  }
  return ok(await listFinanceCharges());
}

async function handlePost(auth: AuthApiContext, req: NextRequest) {
  const parsed = parseBody(createSchema, await req.json());
  if (!parsed.ok) throw ApiError.badRequest(parsed.error);

  const charge = await createFinanceCharge({
    ...parsed.data,
    dateCharge: parsed.data.dateCharge ? new Date(parsed.data.dateCharge) : undefined,
    createdById: auth.userId,
    createdByName: auth.userName,
  });
  return created(charge);
}

export async function GET(req: NextRequest) {
  return withAuthApi(
    'finance/charges GET',
    async (auth, request) => handleGet(auth, request),
    { permission: 'finance:read', fallbackResponse: [] },
  )(req);
}

export async function POST(req: NextRequest) {
  return withAuthApi(
    'finance/charges POST',
    async (auth, request) => handlePost(auth, request),
    { permission: 'finance:write' },
  )(req);
}
