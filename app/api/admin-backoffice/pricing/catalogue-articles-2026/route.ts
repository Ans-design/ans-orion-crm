export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { safeErrorMessage } from '@/lib/api-response';
import {
  applyCatalogueArticles2026,
  applyCatalogueArticles2026FromUpload,
  auditCatalogueArticles2026,
} from '@/lib/server/modules/pricing/catalogue-articles-2026.service';
import { parseCatalogueArticles2026Buffer } from '@/lib/backoffice/catalogue-articles-2026-excel-format';

export const GET = withAuthApi(
  'catalogue-articles-2026 audit',
  async () => {
    try {
      const report = await auditCatalogueArticles2026({ source: 'reference' });
      return NextResponse.json({ ok: true, data: report });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: safeErrorMessage(error, 'Audit Articles 2026 impossible'),
            code: 'CATALOGUE_ARTICLES_2026_AUDIT_ERROR',
          },
        },
        { status: 500 },
      );
    }
  },
  { anyPermissions: ['tarifs:read', 'tarifs:write', 'config:edit_price'] },
);

export const POST = withAuthApi(
  'catalogue-articles-2026 apply',
  async (auth, req: NextRequest) => {
    try {
      const contentType = req.headers.get('content-type') ?? '';

      if (contentType.includes('multipart/form-data')) {
        const form = await req.formData();
        const file = form.get('file');
        const action = String(form.get('action') ?? 'apply');
        if (!(file instanceof File)) {
          return NextResponse.json(
            { ok: false, error: { message: 'Fichier requis', code: 'FILE_REQUIRED' } },
            { status: 400 },
          );
        }
        const buf = Buffer.from(await file.arrayBuffer());
        if (action === 'audit') {
          const wb = parseCatalogueArticles2026Buffer(buf);
          const report = await auditCatalogueArticles2026({
            workbook: wb,
            fileName: file.name,
            source: 'upload',
          });
          return NextResponse.json({ ok: true, data: report });
        }
        const report = await applyCatalogueArticles2026FromUpload(buf, {
          userId: auth.userId,
          userName: auth.userName,
          fileName: file.name,
        });
        return NextResponse.json({ ok: true, data: report });
      }

      const body = (await req.json().catch(() => ({}))) as {
        action?: 'audit' | 'apply' | 'merge-parents';
        useReference?: boolean;
        archiveMisplacedMaterials?: boolean;
        syncCanonicalPos?: boolean;
      };

      if (body.action === 'merge-parents') {
        const { mergeArtVariantsToParents } = await import(
          '@/lib/server/modules/pricing/merge-art-variants-to-parents.service'
        );
        const report = await mergeArtVariantsToParents({
          userId: auth.userId,
          userName: auth.userName,
        });
        return NextResponse.json({ ok: true, data: report });
      }

      if (body.action === 'audit' || (!body.action && body.useReference === false)) {
        const report = await auditCatalogueArticles2026({ source: 'reference' });
        return NextResponse.json({ ok: true, data: report });
      }

      const report = await applyCatalogueArticles2026({
        userId: auth.userId,
        userName: auth.userName,
        fileName: 'docs/references/catalogue-articles-prix-imprimes-exacts-2026.xlsx',
        archiveMisplacedMaterials: body.archiveMisplacedMaterials !== false,
        syncCanonicalPos: body.syncCanonicalPos !== false,
      });
      return NextResponse.json({ ok: true, data: report });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: safeErrorMessage(error, 'Application Articles 2026 impossible'),
            code: 'CATALOGUE_ARTICLES_2026_APPLY_ERROR',
          },
        },
        { status: 500 },
      );
    }
  },
  { anyPermissions: ['tarifs:write', 'config:edit_price', 'config:publish'] },
);
