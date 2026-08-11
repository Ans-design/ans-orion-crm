export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { safeErrorMessage } from '@/lib/api-response';
import {
  auditCatalogue2026Drift,
  auditCatalogue2026FromUpload,
} from '@/lib/server/modules/pricing/catalogue-2026-drift.service';

export const GET = withAuthApi(
  'catalogue-2026 audit',
  async () => {
    try {
      const report = await auditCatalogue2026Drift({ source: 'reference' });
      return NextResponse.json({ ok: true, data: report });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: safeErrorMessage(error, 'Audit Catalogue 2026 impossible'),
            code: 'CATALOGUE_2026_AUDIT_ERROR',
          },
        },
        { status: 500 },
      );
    }
  },
  { anyPermissions: ['tarifs:read', 'tarifs:write', 'config:edit_price'] },
);

export const POST = withAuthApi(
  'catalogue-2026 audit upload',
  async (_auth, req: NextRequest) => {
    try {
      const contentType = req.headers.get('content-type') ?? '';
      if (contentType.includes('multipart/form-data')) {
        const form = await req.formData();
        const file = form.get('file');
        if (!(file instanceof File)) {
          return NextResponse.json(
            { ok: false, error: { message: 'Fichier requis', code: 'FILE_REQUIRED' } },
            { status: 400 },
          );
        }
        const buf = Buffer.from(await file.arrayBuffer());
        const report = await auditCatalogue2026FromUpload(buf, file.name);
        return NextResponse.json({ ok: true, data: report });
      }

      const report = await auditCatalogue2026Drift({ source: 'reference' });
      return NextResponse.json({ ok: true, data: report });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: safeErrorMessage(error, 'Audit Catalogue 2026 impossible'),
            code: 'CATALOGUE_2026_AUDIT_ERROR',
          },
        },
        { status: 500 },
      );
    }
  },
  { anyPermissions: ['tarifs:read', 'tarifs:write', 'config:edit_price'] },
);
