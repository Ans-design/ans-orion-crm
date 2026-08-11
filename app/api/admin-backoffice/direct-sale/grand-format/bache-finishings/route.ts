export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  getGfAdminPricingConfig,
  loadGfAdminPricingToRuntime,
  resetGfAdminPricingConfig,
  saveGfAdminPricingConfig,
} from '@/lib/services/gf-admin-pricing.service';
import { DEFAULT_GF_ADMIN_PRICING } from '@/lib/grand-format/gf-admin-config';

export async function GET() {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;
  try {
    const { config, source } = await getGfAdminPricingConfig();
    await loadGfAdminPricingToRuntime();
    return NextResponse.json({
      ok: true,
      data: { config, source, defaults: DEFAULT_GF_ADMIN_PRICING },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Config GF indisponible') } },
      { status: 503 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('config:edit_price');
  if ('error' in auth) return auth.error;
  try {
    const body = await req.json();
    if (body?.reset === true || body?.type === 'reset') {
      const config = await resetGfAdminPricingConfig(auth.userId);
      return NextResponse.json({ ok: true, data: { config, source: 'defaults' } });
    }
    const config = await saveGfAdminPricingConfig(body?.config ?? body ?? {}, auth.userId);
    return NextResponse.json({ ok: true, data: { config, source: 'db' } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Enregistrement impossible') } },
      { status: 400 },
    );
  }
}
