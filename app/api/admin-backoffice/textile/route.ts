export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import {
  listTextileRows,
  exportTextileExcelRows,
  importTextileExcel,
  softDeleteTextileRow,
  restoreTextileRow,
  exportTextileWorkbook,
  importTextileWorkbook,
  syncAllTextile,
  columnsForTextileKind,
  priceKeyForTextileKind,
  type TextileTableKind,
} from '@/lib/server/modules/textile/textile-admin.service';
import { scanTextileAnomalies } from '@/lib/pricing/textile-anomalies';
import { prisma } from '@/lib/prisma';

const KINDS: TextileTableKind[] = ['supports', 'markings', 'labors', 'rules', 'tiers'];

function nameKeyFor(kind: TextileTableKind) {
  if (kind === 'supports') return 'matiere';
  if (kind === 'markings') return 'technique';
  if (kind === 'labors') return 'typeLabor';
  if (kind === 'rules') return 'articleId';
  return 'articleId';
}

export const GET = withAuthApi(
  'textile list',
  async (_auth, req: NextRequest) => {
    const kind = (req.nextUrl.searchParams.get('kind') || 'supports') as TextileTableKind;
    if (req.nextUrl.searchParams.get('anomalies') === '1') {
      const anomalies = await scanTextileAnomalies();
      return NextResponse.json({ ok: true, data: { anomalies } });
    }
    if (req.nextUrl.searchParams.get('history') === '1') {
      const history = await prisma.auditLog.findMany({
        where: { entity: { startsWith: 'Textile' } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return NextResponse.json({ ok: true, data: { history } });
    }
    if (!KINDS.includes(kind)) {
      return NextResponse.json({ ok: false, error: { message: 'kind invalide' } }, { status: 400 });
    }
    const trash = req.nextUrl.searchParams.get('trash') === '1';
    const rows = await listTextileRows(kind, trash);
    return NextResponse.json({
      ok: true,
      data: {
        rows,
        excelColumns: columnsForTextileKind(kind),
        priceKey: priceKeyForTextileKind(kind),
        nameKey: nameKeyFor(kind),
        kind,
        trash,
      },
    });
  },
  { anyPermissions: ['config:view', 'tarifs:read'] },
);

export const POST = withAuthApi(
  'textile post',
  async (auth, req: NextRequest) => {
    const body = (await req.json()) as Record<string, unknown>;
    const kind = String(body.kind || 'supports') as TextileTableKind;
    if (
      body.action !== 'export-workbook'
      && body.action !== 'import-workbook'
      && body.action !== 'sync-all'
      && body.action !== 'scan-anomalies'
      && !KINDS.includes(kind)
    ) {
      return NextResponse.json({ ok: false, error: { message: 'kind invalide' } }, { status: 400 });
    }
    const opts = { userId: auth.userId, userName: auth.userName };

    if (body.action === 'sync-all') {
      const data = await syncAllTextile(opts);
      return NextResponse.json({ ok: true, data });
    }

    if (body.action === 'scan-anomalies') {
      const anomalies = await scanTextileAnomalies();
      return NextResponse.json({ ok: true, data: { anomalies } });
    }

    if (body.action === 'export-workbook') {
      const sheets = await exportTextileWorkbook();
      return NextResponse.json({
        ok: true,
        data: {
          sheets: [
            { name: '01_SUPPORTS_TEXTILES', columns: columnsForTextileKind('supports'), rows: sheets.supports },
            { name: '02_MARQUAGE_TEXTILE', columns: columnsForTextileKind('markings'), rows: sheets.markings },
            { name: '03_MAIN_OEUVRE_TEXTILE', columns: columnsForTextileKind('labors'), rows: sheets.labors },
            { name: '04_RÈGLES_TEXTILE', columns: columnsForTextileKind('rules'), rows: sheets.rules },
            { name: '05_PALIERS_REMISES_TEXTILE', columns: columnsForTextileKind('tiers'), rows: sheets.tiers },
          ],
        },
      });
    }

    if (body.action === 'import-workbook') {
      const sheets = (body.sheets as Record<string, Record<string, unknown>[]>) ?? {};
      const report = await importTextileWorkbook(sheets, opts);
      return NextResponse.json({ ok: true, data: report });
    }

    if (body.action === 'export') {
      const rows = await listTextileRows(kind);
      return NextResponse.json({
        ok: true,
        data: { rows: exportTextileExcelRows(kind, rows), columns: columnsForTextileKind(kind) },
      });
    }

    if (body.action === 'import') {
      const rows = Array.isArray(body.rows) ? (body.rows as Record<string, unknown>[]) : [];
      const report = await importTextileExcel(kind, rows, opts);
      return NextResponse.json({ ok: true, data: report });
    }

    if (body.action === 'archive' && body.id) {
      const data = await softDeleteTextileRow(kind, String(body.id), opts);
      return NextResponse.json({ ok: true, data });
    }

    if (body.action === 'restore' && body.id) {
      const data = await restoreTextileRow(kind, String(body.id), opts);
      return NextResponse.json({ ok: true, data });
    }

    return NextResponse.json({ ok: false, error: { message: 'action inconnue' } }, { status: 400 });
  },
  { anyPermissions: ['tarifs:write'] },
);
