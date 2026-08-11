export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import {
  ensurePaperBagPricingRuntimeReady,
  invalidatePaperBagPricingRuntime,
  seedPaperBagPricingDefaults,
} from '@/lib/services/paper-bag-pricing-sync.service';

export const GET = withAuthApi(
  'paper bag admin list',
  async (_auth, req: NextRequest) => {
    const url = new URL(req.url);
    if (url.searchParams.get('seed') === '1') {
      const seeded = await seedPaperBagPricingDefaults();
      await ensurePaperBagPricingRuntimeReady();
      return NextResponse.json({ ok: true, seeded });
    }

    await ensurePaperBagPricingRuntimeReady();
    const { prisma } = await import('@/lib/prisma');

    if (url.searchParams.get('anomalies') === '1') {
      const anomalies: Array<{ code: string; message: string; severity: string }> = [];
      const tpl = await prisma.paperBagTemplateRule.count({ where: { actif: true } });
      if (tpl === 0) {
        anomalies.push({
          code: 'SAC_NO_TEMPLATE',
          message: 'Aucun gabarit sac actif — seed recommandé',
          severity: 'warn',
        });
      }
      const noFormula = await prisma.paperBagTemplateRule.count({
        where: { actif: true, OR: [{ formuleSurface: null }, { formuleSurface: '' }] },
      });
      if (noFormula > 0) {
        anomalies.push({
          code: 'SAC_TEMPLATE_NO_FORMULE',
          message: `${noFormula} type(s) sans formule`,
          severity: 'error',
        });
      }
      const accBad = await prisma.paperBagAccessoryPrice.count({
        where: { actif: true, prixHt: { lte: 0 } },
      });
      if (accBad > 0) {
        anomalies.push({
          code: 'SAC_ACCESSORY_NO_PRICE',
          message: `${accBad} accessoire(s) sans prix`,
          severity: 'error',
        });
      }
      const marge = await prisma.paperBagMarginRule.count({ where: { actif: true } });
      if (marge === 0) {
        anomalies.push({
          code: 'SAC_NO_MARGIN',
          message: 'Aucune règle de marge sac',
          severity: 'warn',
        });
      }
      return NextResponse.json({ ok: true, anomalies });
    }

    const [templates, margins, accessories, rules] = await Promise.all([
      prisma.paperBagTemplateRule.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.paperBagMarginRule.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.paperBagAccessoryPrice.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.paperBagPricingRule.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);

    return NextResponse.json({
      ok: true,
      templates,
      margins,
      accessories,
      rules,
      sheets: {
        '02_TYPES_SACS': templates,
        '05_ACCESSOIRES_SAC_PAPIER': accessories,
        '06_MARGES_SAC_PAPIER': margins,
        '07_REGLES_CALCUL_SAC_PAPIER': rules,
      },
    });
  },
  { anyPermissions: ['config:view', 'tarifs:read'] },
);

export const PATCH = withAuthApi(
  'paper bag admin patch',
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
      'prixHt',
      'actif',
      'visiblePos',
      'commentaire',
      'margeDechetsPct',
      'beneficePct',
      'margeDepensePct',
      'coefficientFond',
      'rabatHautMm',
      'patteCollageMm',
      'formuleSurface',
      'typeSac',
      'accessoire',
    ];
    const patch: Record<string, unknown> = {};
    for (const k of allowed) {
      if (k in data) patch[k] = data[k];
    }
    try {
      if (entity === 'template') {
        await prisma.paperBagTemplateRule.update({ where: { id }, data: patch });
      } else if (entity === 'margin') {
        await prisma.paperBagMarginRule.update({ where: { id }, data: patch });
      } else if (entity === 'accessory') {
        await prisma.paperBagAccessoryPrice.update({ where: { id }, data: patch });
      } else {
        return NextResponse.json({ ok: false, error: 'entity inconnue' }, { status: 400 });
      }
      invalidatePaperBagPricingRuntime();
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
