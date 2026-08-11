import { NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { buildMissingMaterialPricesXlsxBuffer } from '@/lib/server/modules/materials/missing-material-prices-export';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAnyPermission('tarifs:read', 'config:view');
  if ('error' in auth) return auth.error;

  try {
    const { buffer, count, filename } = await buildMissingMaterialPricesXlsxBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Orion-Missing-Count': String(count),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Export impossible') } },
      { status: 500 },
    );
  }
}
