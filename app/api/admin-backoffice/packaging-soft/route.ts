export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import {
  ensureSoftPackagingPricingRuntimeReady,
  invalidateSoftPackagingPricingRuntime,
  seedSoftPackagingDefaults,
} from '@/lib/services/soft-packaging-pricing-sync.service';
import { formatsForDoypackMatiere, getDoypackRuntime } from '@/lib/packaging/doypack-price';
import { getPrecutLabelStandards } from '@/lib/packaging/precut-label-price';

export const GET = withAuthApi(
  'packaging soft admin list',
  async (_auth, req: NextRequest) => {
    const url = new URL(req.url);
    if (url.searchParams.get('seed') === '1') {
      const counts = await seedSoftPackagingDefaults();
      await ensureSoftPackagingPricingRuntimeReady();
      return NextResponse.json({ ok: true, seeded: counts });
    }

    await ensureSoftPackagingPricingRuntimeReady();
    const { prisma } = await import('@/lib/prisma');

    if (url.searchParams.get('anomalies') === '1') {
      const anomalies: Array<{ code: string; message: string; severity: string }> = [];
      const blankCount = await prisma.doypackBlankPrice.count({ where: { actif: true } });
      if (blankCount === 0) {
        anomalies.push({
          code: 'DOYPACK_NO_BLANK',
          message: 'Aucun doypack vierge actif — seed recommandé',
          severity: 'warn',
        });
      }
      const noPrice = await prisma.doypackBlankPrice.count({
        where: { actif: true, prixViergeHt: { lte: 0 } },
      });
      if (noPrice > 0) {
        anomalies.push({
          code: 'DOYPACK_BLANK_NO_PRICE',
          message: `${noPrice} doypack(s) vierge(s) sans prix`,
          severity: 'error',
        });
      }
      const eti = await prisma.precutLabelStandardPrice.count({
        where: { actif: true, prixStandardHt: { lte: 0 } },
      });
      if (eti > 0) {
        anomalies.push({
          code: 'ETIQUETTE_STD_NO_PRICE',
          message: `${eti} étiquette(s) standard sans prix`,
          severity: 'error',
        });
      }
      const cups = await prisma.cupBlankPrice.count({
        where: { actif: true, prixViergeHt: { lte: 0 } },
      });
      if (cups > 0) {
        anomalies.push({
          code: 'CUP_BLANK_NO_PRICE',
          message: `${cups} gobelet(s) vierge(s) sans prix`,
          severity: 'error',
        });
      }
      return NextResponse.json({ ok: true, anomalies });
    }

    const [doypackBlanks, doypackPose, etiquette, cupsRows, hangtagImp, hangtagAcc] =
      await Promise.all([
        prisma.doypackBlankPrice.findMany({ orderBy: { sortOrder: 'asc' } }),
        prisma.doypackApplicationRule.findMany({ orderBy: { sortOrder: 'asc' } }),
        prisma.precutLabelStandardPrice.findMany({ orderBy: { sortOrder: 'asc' } }),
        prisma.cupBlankPrice.findMany({ orderBy: { sortOrder: 'asc' } }),
        prisma.hangtagImpositionRule.findMany({ orderBy: { sortOrder: 'asc' } }),
        prisma.hangtagAccessoryPrice.findMany({ orderBy: { sortOrder: 'asc' } }),
      ]);

    return NextResponse.json({
      ok: true,
      doypackBlanks,
      doypackPose,
      etiquette,
      cups: cupsRows,
      hangtagImp,
      hangtagAcc,
      runtime: {
        doypackFormatsKraft: formatsForDoypackMatiere('Kraft'),
        doypackBlanksRuntime: getDoypackRuntime().blanks.length,
        etiquetteStandards: getPrecutLabelStandards().length,
      },
    });
  },
  { anyPermissions: ['config:view', 'tarifs:read'] },
);

export const PATCH = withAuthApi(
  'packaging soft admin patch',
  async (_auth, req: NextRequest) => {
    const body = await req.json().catch(() => ({}));
    const entity = String(body.entity ?? '');
    const id = String(body.id ?? '');
    const data = (body.data ?? {}) as Record<string, unknown>;
    if (!entity || !id) {
      return NextResponse.json({ ok: false, error: 'entity + id requis' }, { status: 400 });
    }

    const { prisma } = await import('@/lib/prisma');
    const allowed = [
      'prixViergeHt',
      'prixStandardHt',
      'prixHt',
      'actif',
      'visiblePos',
      'commentaire',
      'piecesParFeuille',
      'matiere',
      'formatLabel',
      'typeVinyle',
      'typeGobelet',
      'contenance',
    ];
    const patch: Record<string, unknown> = {};
    for (const k of allowed) {
      if (k in data) patch[k] = data[k];
    }

    try {
      if (entity === 'doypackBlank') {
        await prisma.doypackBlankPrice.update({ where: { id }, data: patch });
      } else if (entity === 'doypackPose') {
        await prisma.doypackApplicationRule.update({ where: { id }, data: patch });
      } else if (entity === 'etiquette') {
        await prisma.precutLabelStandardPrice.update({ where: { id }, data: patch });
      } else if (entity === 'cup') {
        await prisma.cupBlankPrice.update({ where: { id }, data: patch });
      } else if (entity === 'hangtagImp') {
        await prisma.hangtagImpositionRule.update({ where: { id }, data: patch });
      } else if (entity === 'hangtagAcc') {
        await prisma.hangtagAccessoryPrice.update({ where: { id }, data: patch });
      } else {
        return NextResponse.json({ ok: false, error: 'entity inconnue' }, { status: 400 });
      }
      invalidateSoftPackagingPricingRuntime();
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: e instanceof Error ? e.message : 'Erreur' },
        { status: 500 },
      );
    }
  },
  { anyPermissions: ['tarifs:write'] },
);
