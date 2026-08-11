export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { getAdminOverview } from '@/lib/services/admin-overview-service';

export async function GET() {
  const auth = await requirePermission('settings:write');
  if ('error' in auth) return auth.error;

  try {
    const data = await getAdminOverview();
    return NextResponse.json(data);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur vue d\'ensemble'), 500);
  }
}
