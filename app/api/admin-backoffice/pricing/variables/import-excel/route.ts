export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { safeErrorMessage } from '@/lib/api-response';
import { importChipsFromExcel } from '@/lib/server/modules/backoffice-v2/chips-excel-import.service';
import { validateVariablesExcelRows } from '@/lib/backoffice/variables-excel-format';
import { notifyAdminModuleMutation } from '@/lib/services/admin-data-sync.service';

/** Import variables globales — délègue au pipeline chips/options (même source DB). */
function variablesRowsToChipRows(rows: Record<string, unknown>[]) {
  return rows.map((line) => {
    const pick = (...keys: string[]) => {
      for (const k of keys) {
        const v = line[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
      }
      return '';
    };
    return {
      ARTICLE: pick('ARTICLE', 'Article'),
      RÉFÉRENCE: pick('RÉFÉRENCE', 'Reference', 'articleId'),
      BLOC: pick('BLOC', 'Bloc'),
      CHAMP: pick('CHAMP', 'Champ', 'fieldKey'),
      LIBELLÉ: pick('LIBELLÉ', 'Libelle', 'label'),
      TYPE: pick('TYPE', 'Type') || 'select',
      ACTIF: pick('ACTIF', 'Actif') || 'oui',
      'VISIBLE POS': pick('POS', 'Visible POS', 'VISIBLE POS') || pick('VISIBLE POS'),
      'IMPACT PRIX': pick('IMPACT PRIX', 'Impact prix'),
      INDICATIF: pick('INDICATIF', 'Indicatif'),
      MONTANT: pick('MONTANT', 'Montant'),
      SOURCE: pick('SOURCE', 'Source'),
      ID: pick('ID', 'id'),
    };
  });
}

export const POST = withAuthApi(
  'variables import-excel',
  async (auth, req) => {
    try {
      const body = (await req.json()) as { rows?: Record<string, unknown>[]; fileName?: string };
      const rows = Array.isArray(body.rows) ? body.rows : [];
      if (!rows.length) {
        return NextResponse.json(
          { ok: false, error: { message: 'Aucune ligne à importer', code: 'IMPORT_EMPTY' } },
          { status: 400 },
        );
      }
      const validation = validateVariablesExcelRows(rows);
      if (!validation.ok) {
        return NextResponse.json(
          { ok: false, error: { message: validation.message ?? 'Fichier invalide', code: 'VALIDATION' } },
          { status: 400 },
        );
      }
      const report = await importChipsFromExcel(variablesRowsToChipRows(rows), {
        userId: auth.userId,
        userName: auth.userName,
        fileName: body.fileName,
      });
      await notifyAdminModuleMutation('variables', {
        userId: auth.userId,
        userName: auth.userName,
        details: { import: report },
      });
      return NextResponse.json({ ok: true, data: report });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: safeErrorMessage(error, 'Import Excel variables impossible'),
            code: 'VARIABLES_IMPORT_ERROR',
          },
        },
        { status: 500 },
      );
    }
  },
  { permission: 'tarifs:write' },
);
