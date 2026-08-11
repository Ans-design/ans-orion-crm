export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import {
  listGoodiesRows,
  exportGoodiesExcelRows,
  importGoodiesExcel,
  syncAllGoodies,
  softDeleteGoodiesRow,
  listGoodiesTrash,
  restoreGoodiesRow,
  exportGoodiesWorkbook,
  importGoodiesWorkbook,
  type GoodiesTableKind,
} from '@/lib/server/modules/goodies/goodies-admin.service';
import {
  GOODIES_MODELS_COLUMNS,
  GOODIES_TECHNIQUES_COLUMNS,
  GOODIES_ADDONS_COLUMNS,
  GOODIES_DEPS_COLUMNS,
} from '@/lib/backoffice/goodies-excel-format';

const KINDS: GoodiesTableKind[] = ['models', 'techniques', 'addons', 'deps'];

function columnsFor(kind: GoodiesTableKind) {
  if (kind === 'models') return GOODIES_MODELS_COLUMNS;
  if (kind === 'techniques') return GOODIES_TECHNIQUES_COLUMNS;
  if (kind === 'addons') return GOODIES_ADDONS_COLUMNS;
  return GOODIES_DEPS_COLUMNS;
}

function priceKeyFor(kind: GoodiesTableKind) {
  if (kind === 'models') return 'prixVierge';
  if (kind === 'techniques') return 'prixTechnique';
  if (kind === 'addons') return 'price';
  return 'allowedValues';
}

function nameKeyFor(kind: GoodiesTableKind) {
  if (kind === 'models') return 'typeModele';
  if (kind === 'techniques') return 'technique';
  if (kind === 'addons') return 'name';
  return 'sourceValue';
}

export const GET = withAuthApi(
  'goodies list',
  async (_auth, req: NextRequest) => {
    const kind = (req.nextUrl.searchParams.get('kind') || 'models') as GoodiesTableKind;
    if (!KINDS.includes(kind)) {
      return NextResponse.json({ ok: false, error: { message: 'kind invalide' } }, { status: 400 });
    }
    const trash = req.nextUrl.searchParams.get('trash') === '1';
    const rows = trash ? await listGoodiesTrash(kind) : await listGoodiesRows(kind);
    return NextResponse.json({
      ok: true,
      data: {
        rows,
        excelColumns: columnsFor(kind),
        priceKey: priceKeyFor(kind),
        nameKey: nameKeyFor(kind),
        kind,
        trash,
      },
    });
  },
  { anyPermissions: ['config:view', 'tarifs:read'] },
);

export const POST = withAuthApi(
  'goodies post',
  async (auth, req: NextRequest) => {
    const body = (await req.json()) as Record<string, unknown>;
    const kind = (String(body.kind || 'models') as GoodiesTableKind);
    if (body.action !== 'export-workbook' && body.action !== 'import-workbook' && !KINDS.includes(kind)) {
      return NextResponse.json({ ok: false, error: { message: 'kind invalide' } }, { status: 400 });
    }
    const opts = { userId: auth.userId, userName: auth.userName };

    if (body.action === 'sync-all') {
      const data = await syncAllGoodies(opts);
      return NextResponse.json({ ok: true, data: { synced: data.modelsSynced + data.techniquesSynced, ...data } });
    }

    if (body.action === 'export-workbook') {
      const sheets = await exportGoodiesWorkbook();
      return NextResponse.json({
        ok: true,
        data: {
          sheets: [
            { name: '01_Goodies_Modeles', columns: GOODIES_MODELS_COLUMNS, rows: sheets.models },
            { name: '02_Goodies_Techniques', columns: GOODIES_TECHNIQUES_COLUMNS, rows: sheets.techniques },
            { name: '03_Goodies_Supplements', columns: GOODIES_ADDONS_COLUMNS, rows: sheets.addons },
            { name: '04_Dependances_Options', columns: GOODIES_DEPS_COLUMNS, rows: sheets.deps },
          ],
        },
      });
    }

    if (body.action === 'import-workbook') {
      const sheets = (body.sheets as Record<string, Record<string, unknown>[]>) ?? {};
      const report = await importGoodiesWorkbook(sheets, opts);
      return NextResponse.json({ ok: true, data: report });
    }

    if (body.action === 'export') {
      const rows = await listGoodiesRows(kind);
      return NextResponse.json({
        ok: true,
        data: { rows: exportGoodiesExcelRows(kind, rows), columns: columnsFor(kind) },
      });
    }

    if (body.action === 'import') {
      const rows = Array.isArray(body.rows) ? (body.rows as Record<string, unknown>[]) : [];
      const report = await importGoodiesExcel(kind, rows, opts);
      return NextResponse.json({ ok: true, data: report });
    }

    if (body.action === 'archive' && body.id) {
      const data = await softDeleteGoodiesRow(kind, String(body.id), opts);
      return NextResponse.json({ ok: true, data });
    }

    if (body.action === 'restore' && body.id) {
      const data = await restoreGoodiesRow(kind, String(body.id), opts);
      return NextResponse.json({ ok: true, data });
    }

    return NextResponse.json({ ok: false, error: { message: 'action inconnue' } }, { status: 400 });
  },
  { anyPermissions: ['tarifs:write'] },
);
