export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseOr400 } from '@/lib/validators/parse';
import { created } from '@/lib/server/http/api-response';
import {
  createFiscalObligation,
  getFiscalDashboardSnapshot,
  getFiscalObligationStats,
  listFiscalObligations,
  notifyUpcomingFiscalDeadlines,
} from '@/lib/services/fiscal-obligation-service';

const createSchema = z.object({
  type: z.string().min(1),
  label: z.string().min(1),
  periode: z.string().min(1),
  dateEcheance: z.string(),
  montant: z.number().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requirePermission('factures:read');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  try {
    const [obligations, stats, snapshot] = await Promise.all([
      listFiscalObligations({
        statut: searchParams.get('statut') ?? undefined,
        type: searchParams.get('type') ?? undefined,
      }),
      getFiscalObligationStats(),
      getFiscalDashboardSnapshot(),
    ]);
    return NextResponse.json({ obligations, stats, snapshot });
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur fiscalité'), 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('finance:write');
  if ('error' in auth) return auth.error;

  const parsed = parseOr400(createSchema, await req.json());
  if ('error' in parsed) return parsed.error;

  try {
    const { dateEcheance, ...rest } = parsed.data;
    const obligation = await createFiscalObligation({
      ...rest,
      dateEcheance: new Date(dateEcheance),
      createdBy: auth.userId,
    });
    await notifyUpcomingFiscalDeadlines().catch(() => {});
    return created(obligation);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur création obligation'), 500);
  }
}
