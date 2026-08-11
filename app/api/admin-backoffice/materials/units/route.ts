export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import {
  MATERIAL_UNIT_DISPLAY_OPTIONS,
  MATERIAL_UNIT_STANDARD_OPTIONS,
} from '@/lib/server/modules/materials/materials-unit-conversion.service';

export async function GET() {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;

  return NextResponse.json({
    ok: true,
    data: {
      unitDisplay: MATERIAL_UNIT_DISPLAY_OPTIONS,
      unitStandard: MATERIAL_UNIT_STANDARD_OPTIONS,
    },
  });
}
