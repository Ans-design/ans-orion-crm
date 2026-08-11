export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { safeErrorMessage } from '@/lib/api-response';
import {
  ensureCatalogueExcelRowIds,
  importCataloguePosFromExcel,
} from '@/lib/server/modules/catalogue/catalogue-pos-excel-import.service';

export const POST = withAuthApi(
  'catalogue-pos import-excel',
  async (auth, req) => {
    try {
      const body = (await req.json()) as {
        rows?: Record<string, unknown>[];
        fileName?: string;
        action?: string;
        articleIds?: string[];
        family?: string;
        dryRun?: boolean;
      };

      if (body.action === 'prepare-export') {
        const ids = await ensureCatalogueExcelRowIds();
        return NextResponse.json({ ok: true, data: ids });
      }

      if (body.action === 'repair-categories') {
        const { repairMisclassifiedPosCategories } = await import(
          '@/lib/services/pos-category-repair.service'
        );
        const result = await repairMisclassifiedPosCategories({ dryRun: body.dryRun === true });
        return NextResponse.json({ ok: true, data: result });
      }

      if (body.action === 'reassign-category') {
        const family = String(body.family ?? '').trim();
        const articleIds = Array.isArray(body.articleIds) ? body.articleIds.filter(Boolean) : [];
        if (!family || articleIds.length === 0) {
          return NextResponse.json(
            { ok: false, error: { message: 'family et articleIds requis', code: 'BAD_REQUEST' } },
            { status: 400 },
          );
        }
        const { canonicalFamilyLabel, normalizeCategoryId, suggestCorrectCategory } = await import(
          '@/lib/pos/article-category-taxonomy'
        );
        const { updateBackofficeArticle } = await import('@/lib/services/backoffice-article-service');
        const categoryId = normalizeCategoryId(family) ?? suggestCorrectCategory({ family });
        const label = canonicalFamilyLabel(categoryId);
        let updated = 0;
        for (const articleId of articleIds) {
          await updateBackofficeArticle(articleId, { family: label });
          updated += 1;
        }
        const { invalidatePOSCache } = await import('@/lib/services/admin-to-commercial-sync.service');
        await invalidatePOSCache({ userId: auth.userId, userName: auth.userName });
        return NextResponse.json({ ok: true, data: { updated, family: label, categoryId } });
      }

      if (body.action === 'detect-duplicates') {
        const { detectCatalogDuplicates } = await import(
          '@/lib/services/detect-catalog-duplicates.service'
        );
        const data = await detectCatalogDuplicates();
        return NextResponse.json({ ok: true, data });
      }

      if (body.action === 'merge-personalized-duplicates') {
        const { mergePersonalizedDuplicateArticles } = await import(
          '@/lib/services/merge-personalized-articles.service'
        );
        const result = await mergePersonalizedDuplicateArticles({
          userId: auth.userId,
          userName: auth.userName,
        });
        const { syncAdminToPOS } = await import('@/lib/services/admin-to-commercial-sync.service');
        await syncAdminToPOS({
          userId: auth.userId,
          userName: auth.userName,
          options: false,
          directSale: false,
          prices: false,
        });
        return NextResponse.json({ ok: true, data: result });
      }

      if (body.action === 'merge-variant-cards') {
        const { mergeVariantPosCards } = await import(
          '@/lib/services/merge-variant-pos-cards.service'
        );
        const result = await mergeVariantPosCards({
          userId: auth.userId,
          userName: auth.userName,
        });
        const { syncAdminToPOS } = await import('@/lib/services/admin-to-commercial-sync.service');
        await syncAdminToPOS({
          userId: auth.userId,
          userName: auth.userName,
          options: false,
          directSale: false,
          prices: false,
        });
        return NextResponse.json({ ok: true, data: result });
      }

      if (body.action === 'merge-duplicates') {
        const primaryArticleId = String(
          (body as { primaryArticleId?: string }).primaryArticleId ?? '',
        ).trim();
        const duplicateArticleIds = Array.isArray(body.articleIds)
          ? body.articleIds.filter(Boolean)
          : [];
        if (!primaryArticleId || duplicateArticleIds.length === 0) {
          return NextResponse.json(
            {
              ok: false,
              error: { message: 'primaryArticleId et articleIds requis', code: 'BAD_REQUEST' },
            },
            { status: 400 },
          );
        }
        const { mergeDuplicateArticles } = await import(
          '@/lib/services/merge-personalized-articles.service'
        );
        const result = await mergeDuplicateArticles(primaryArticleId, duplicateArticleIds, {
          userId: auth.userId,
          userName: auth.userName,
        });
        return NextResponse.json({ ok: true, data: result });
      }

      const rows = Array.isArray(body.rows) ? body.rows : [];
      if (!rows.length) {
        return NextResponse.json(
          { ok: false, error: { message: 'Aucune ligne à importer', code: 'IMPORT_EMPTY' } },
          { status: 400 },
        );
      }

      const report = await importCataloguePosFromExcel(rows, {
        userId: auth.userId,
        userName: auth.userName,
        fileName: body.fileName,
      });
      const { afterExcelImport } = await import('@/lib/services/excel-import-sync.service');
      const wrapped = await afterExcelImport(report, {
        userId: auth.userId,
        userName: auth.userName,
        domain: 'catalogue-pos',
        syncPos: true,
      });
      return NextResponse.json({ ok: true, data: { ...report, sync: wrapped.sync } });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: safeErrorMessage(error, 'Import Excel catalogue impossible'),
            code: 'CATALOGUE_IMPORT_ERROR',
          },
        },
        { status: 500 },
      );
    }
  },
  { permission: 'tarifs:write' },
);
