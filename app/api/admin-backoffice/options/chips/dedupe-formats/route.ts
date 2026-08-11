export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { mergeDuplicateFormatOptions } from '@/lib/services/merge-duplicate-format-options.service';
import { syncAdminToCommercialPOS } from '@/lib/services/admin-to-commercial-sync.service';

/**
 * POST — fusionne les chips Format en doublon (A5 / A5 — 148×210 mm).
 * Body: { articleId?: string, dryRun?: boolean, syncPos?: boolean }
 */
export async function POST(req: NextRequest) {
  const auth = await requirePermission('config:edit_chips');
  if ('error' in auth) return auth.error;

  try {
    let body: { articleId?: string; dryRun?: boolean; syncPos?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const report = await mergeDuplicateFormatOptions({
      articleId: body.articleId,
      dryRun: body.dryRun === true,
      userId: auth.userId,
      userName: auth.userId,
    });

    let sync: Awaited<ReturnType<typeof syncAdminToCommercialPOS>> | null = null;
    if (body.dryRun !== true && body.syncPos !== false && report.articlesTouched.length) {
      sync = await syncAdminToCommercialPOS({
        userId: auth.userId,
        userName: auth.userId,
        full: false,
        options: true,
        directSale: false,
        prices: true,
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        report,
        sync: sync
          ? {
              ok: sync.ok,
              message: sync.message,
              pricingDrifts: sync.pricingDrifts,
            }
          : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: safeErrorMessage(error, 'Dédoublonnage formats impossible'),
          code: 'FORMAT_DEDUPE_ERROR',
        },
      },
      { status: 503 },
    );
  }
}
