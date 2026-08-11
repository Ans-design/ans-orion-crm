export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { importPrixMatieresStockWorkbook } from '@/lib/services/prix-matieres-stock-excel-import.service';
import { rebuildPOSPriceIndex } from '@/lib/services/pricing-data-sync.service';

/**
 * Import multi-feuilles — prévisualisation (dryRun) puis écriture atomique ($transaction).
 * Feuilles : 01_Matieres_Stock, 02_Prix_Base|02_Prix_Par_Contexte, 03_ISF, 04_Grand_Format.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAnyPermission('tarifs:write', 'config:edit_price', 'config:import');
  if ('error' in auth) return auth.error;

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Fichier Excel requis (champ file)' }, { status: 400 });
    }

    const isReal =
      form.get('dryRun') === '0'
      || form.get('dryRun') === 'false';
    const abortOnErrors = form.get('abortOnErrors') !== '0';

    const buf = Buffer.from(await file.arrayBuffer());
    const result = await importPrixMatieresStockWorkbook(buf, {
      dryRun: !isReal,
      abortOnErrors,
    });

    if (result.aborted) {
      return NextResponse.json(
        { ok: false, error: result.message, data: result },
        { status: 422 },
      );
    }

    if (result.dryRun || !result.applied) {
      return NextResponse.json({
        ok: true,
        data: {
          ...result,
          synced: false,
          critical: result.totals.errors > 0,
        },
      });
    }

    await rebuildPOSPriceIndex();
    const { afterExcelImport } = await import('@/lib/services/excel-import-sync.service');
    const syncWrap = await afterExcelImport({ reports: result.reports }, {
      userId: auth.userId,
      userName: auth.userName,
      domain: 'prix-matieres-stock',
      syncPos: true,
    });

    return NextResponse.json({
      ok: true,
      data: {
        ...result,
        synced: true,
        sync: syncWrap.sync,
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: safeErrorMessage(e) }, { status: 500 });
  }
}
