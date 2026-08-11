export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { logAudit } from '@/lib/audit';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { runApiHandler } from '@/lib/api-guard';
import {
  listGlobalPricingVariables,
  updateGlobalPricingVariable,
} from '@/lib/server/modules/pricing/pricing-variables.service';

export async function GET() {
  const auth = await requirePermission('tarifs:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin-backoffice/pricing/pricing-variables GET', async () => {
    const items = await listGlobalPricingVariables();
    return NextResponse.json({ ok: true, items });
  }, { fallbackResponse: { ok: false, error: 'Variables tarification indisponibles', items: [] } });
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin-backoffice/pricing/pricing-variables PATCH', async (): Promise<Response> => {
    try {
      const body = await req.json().catch(() => null);
      if (!body || typeof body !== 'object') {
        return apiError('Corps JSON invalide', 400);
      }

      const code = typeof (body as { code?: unknown }).code === 'string'
        ? (body as { code: string }).code
        : '';
      const value = (body as { value?: unknown }).value;
      const labelRaw = (body as { label?: unknown }).label;

      if (!code.trim()) return apiError('code requis', 400);
      if (value == null || (typeof value !== 'string' && typeof value !== 'number')) {
        return apiError('value requise (string ou number)', 400);
      }
      if (labelRaw != null && typeof labelRaw !== 'string') {
        return apiError('label doit être une chaîne', 400);
      }

      const item = await updateGlobalPricingVariable(
        {
          code,
          value: String(value),
          ...(typeof labelRaw === 'string' ? { label: labelRaw } : {}),
        },
        auth.userId!,
      );

      await logAudit({
        userId: auth.userId,
        userName: auth.userName,
        action: 'UPDATE',
        entity: 'PricingVariable',
        entityLabel: item.code,
        details: { code: item.code, value: item.value, label: item.label },
      });

      return NextResponse.json({ ok: true, item });
    } catch (error) {
      const msg = safeErrorMessage(error, 'Erreur mise à jour variable');
      const status = /introuvable|requise|requis/i.test(msg) ? 400 : 500;
      return apiError(msg, status);
    }
  });
}
