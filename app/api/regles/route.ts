export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getPrismaClient } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-utils';
import { syncReglesFromCatalogue } from '@/lib/regles-sync';
import { logAudit } from '@/lib/audit';
import { created } from '@/lib/server/http/api-response';
import {
  buildCatalogueSnapshot,
  filterCatalogRules,
  computeRuleStats,
  isPrismaReglesReady,
} from '@/lib/regles-catalog';
import { containsQ } from '@/lib/prisma-filters';
import { parseBody } from '@/lib/validators/common';
import {
  createBusinessRuleSchema,
  reglesSyncActionSchema,
} from '@/lib/server/modules/regles/regles.validation';

function catalogueResponse(search: string, family: string, ruleType: string, articleId: string) {
  const snapshot = buildCatalogueSnapshot();
  const rules = filterCatalogRules(snapshot.rules, { search, family, ruleType, articleId });
  const stats = computeRuleStats(snapshot.rules);
  return NextResponse.json({
    rules,
    stats: { ...stats, total: snapshot.rules.length },
    source: 'html-catalogue',
    persisted: false,
  });
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission('regles:read');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const family = searchParams.get('family') || '';
  const ruleType = searchParams.get('ruleType') || '';
  const articleId = searchParams.get('articleId') || '';
  const search = searchParams.get('search') || '';

  const db = getPrismaClient();
  if (!isPrismaReglesReady(db)) {
    return catalogueResponse(search, family, ruleType, articleId);
  }

  try {
    const where: Record<string, unknown> = {};
    if (family) where.family = family;
    if (ruleType) where.ruleType = ruleType;
    if (articleId) where.articleId = articleId;
    if (search) {
      where.OR = [
        { ruleName: containsQ(search) },
        { ruleKey: containsQ(search) },
        { message: containsQ(search) },
      ];
    }

    const [rules, total, connected, disconnected, allForStats] = await Promise.all([
      db.businessRule.findMany({ where, orderBy: [{ priority: 'asc' }, { ruleName: 'asc' }] }),
      db.businessRule.count({ where }),
      db.businessRule.count({ where: { connected: true, active: true } }),
      db.businessRule.count({ where: { connected: false } }),
      db.businessRule.findMany({ select: { ruleType: true } }),
    ]);

    if (total === 0 && !search && !family && !ruleType && !articleId) {
      return catalogueResponse(search, family, ruleType, articleId);
    }

    const typeCounts: Record<string, number> = {};
    allForStats.forEach((r) => { typeCounts[r.ruleType] = (typeCounts[r.ruleType] || 0) + 1; });
    const byType = Object.entries(typeCounts).map(([rt, _count]) => ({ ruleType: rt, _count }));

    return NextResponse.json({
      rules,
      stats: { total, byType, connected, disconnected },
      source: 'database',
      persisted: true,
    });
  } catch (e) {
    console.error('[GET /api/regles] fallback catalogue', e);
    return catalogueResponse(search, family, ruleType, articleId);
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  const syncCheck = reglesSyncActionSchema.safeParse(body);
  if (syncCheck.success) {
    const auth = await requirePermission('regles:write');
    if ('error' in auth) return auth.error;

    const db = getPrismaClient();
    if (!isPrismaReglesReady(db)) {
      const snapshot = buildCatalogueSnapshot();
      return NextResponse.json({
        success: true,
        formulas: snapshot.formulas.length,
        rules: snapshot.rules.length,
        source: 'html-catalogue',
        persisted: false,
        message: 'Données chargées depuis le catalogue HTML (base ok.html). Redémarrez npm run dev puis npm run seed:regles pour persister en base.',
      });
    }

    try {
      const result = await syncReglesFromCatalogue(auth.userId);
      await logAudit({
        userId: auth.userId,
        userName: auth.userName,
        action: 'UPDATE',
        entity: 'BusinessRule',
        entityLabel: 'Sync catalogue',
        details: result,
      });
      return NextResponse.json({ success: true, ...result, source: 'database', persisted: true });
    } catch (e) {
      console.error('[POST /api/regles sync] fallback', e);
      const snapshot = buildCatalogueSnapshot();
      return NextResponse.json({
        success: true,
        formulas: snapshot.formulas.length,
        rules: snapshot.rules.length,
        source: 'html-catalogue',
        persisted: false,
        message: 'Sync base échouée — affichage catalogue HTML actif. Lancez npm run seed:regles après redémarrage.',
      });
    }
  }

  const auth = await requirePermission('regles:write');
  if ('error' in auth) return auth.error;

  const parsed = parseBody(createBusinessRuleSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const {
    family,
    articleId,
    ruleKey,
    ruleName,
    ruleType,
    condition,
    action: ruleAction,
    message,
    priority,
    active,
    connected,
  } = parsed.data;

  const db = getPrismaClient();
  if (!isPrismaReglesReady(db)) {
    return NextResponse.json({ error: 'Base indisponible — mode catalogue HTML uniquement' }, { status: 503 });
  }

  const rule = await db.businessRule.create({
    data: {
      family: family || 'Général',
      articleId: articleId || null,
      ruleKey,
      ruleName,
      ruleType,
      condition: (condition || {}) as Prisma.InputJsonValue,
      action: (ruleAction || {}) as Prisma.InputJsonValue,
      message: message || null,
      priority: priority ?? 100,
      active: active !== false,
      connected: connected !== false,
      createdBy: auth.userId,
      source: 'manual',
    },
  });

  await db.ruleVersion.create({
    data: {
      entityType: 'BusinessRule',
      entityId: rule.id,
      newValue: rule,
      userId: auth.userId,
      reason: 'Création manuelle',
    },
  });

  return created(rule);
}
