/**
 * Factory handlers pour tables tarifaires (finitions, GF, design).
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/api-response';

type TableKind = 'finishing' | 'grand-format' | 'design';

const CONFIG = {
  finishing: {
    model: () => prisma.finishingPrice,
    priceField: 'unitPrice',
    sync: async (id: string, opts?: { userId?: string; userName?: string }) => {
      const { syncFinishingPriceToPos } = await import('@/lib/services/direct-sale-pos-sync.service');
      return syncFinishingPriceToPos(id, opts);
    },
    syncAll: async (opts?: { userId?: string; userName?: string }) => {
      const { syncAllFinishingToPos } = await import('@/lib/server/modules/direct-sale/pricing-tables.service');
      return syncAllFinishingToPos(opts);
    },
    list: async () => {
      const { listFinishingPrices } = await import('@/lib/server/modules/direct-sale/pricing-tables.service');
      return listFinishingPrices();
    },
  },
  'grand-format': {
    model: () => prisma.grandFormatPricing,
    priceField: 'pricePerM2',
    sync: async (id: string, opts?: { userId?: string; userName?: string }) => {
      const { syncGrandFormatPricingToPos } = await import('@/lib/services/direct-sale-pos-sync.service');
      return syncGrandFormatPricingToPos(id, opts);
    },
    syncAll: async (opts?: { userId?: string; userName?: string }) => {
      const { syncAllGrandFormatToPos } = await import('@/lib/server/modules/direct-sale/pricing-tables.service');
      return syncAllGrandFormatToPos(opts);
    },
    list: async () => {
      const { listGrandFormatPricing } = await import('@/lib/server/modules/direct-sale/pricing-tables.service');
      return listGrandFormatPricing();
    },
  },
  design: {
    model: () => prisma.graphicDesignService,
    priceField: 'unitPrice',
    sync: async (id: string, opts?: { userId?: string; userName?: string }) => {
      const { syncGraphicDesignServiceToPos } = await import('@/lib/services/direct-sale-pos-sync.service');
      return syncGraphicDesignServiceToPos(id, opts);
    },
    syncAll: async (opts?: { userId?: string; userName?: string }) => {
      const { syncAllDesignToPos } = await import('@/lib/server/modules/direct-sale/pricing-tables.service');
      return syncAllDesignToPos(opts);
    },
    list: async () => {
      const { listGraphicDesignServices } = await import('@/lib/server/modules/direct-sale/pricing-tables.service');
      return listGraphicDesignServices();
    },
  },
} as const;

export async function handlePricingTableList(kind: TableKind) {
  // Auto-backfill GF si table vide (idempotent) — Admin ne doit pas rester vide
  if (kind === 'grand-format') {
    try {
      const count = await prisma.grandFormatPricing.count({
        where: { NOT: { status: 'archived' } },
      });
      if (count === 0) {
        const { backfillGrandFormatAdminFromPos } = await import(
          '@/lib/services/grand-format-admin-backfill.service'
        );
        await backfillGrandFormatAdminFromPos({});
      }
    } catch (e) {
      console.warn('[grand-format] auto-backfill', e);
    }
  }
  if (kind === 'finishing') {
    try {
      const count = await prisma.finishingPrice.count({
        where: { NOT: { status: 'archived' } },
      });
      if (count === 0) {
        const { backfillFinishingAdminFromCatalog } = await import(
          '@/lib/services/finishing-admin-backfill.service'
        );
        await backfillFinishingAdminFromCatalog({});
      }
    } catch (e) {
      console.warn('[finishing] auto-backfill', e);
    }
  }
  const rows = await CONFIG[kind].list();
  return NextResponse.json({ ok: true, data: { rows } });
}

export async function handlePricingTablePost(
  kind: TableKind,
  body: Record<string, unknown>,
  auth: { userId?: string; userName?: string },
) {
  if (body.action === 'sync-all') {
    const result = await CONFIG[kind].syncAll(auth);
    return NextResponse.json({ ok: true, data: result });
  }

  if (kind === 'grand-format' && (body.action === 'seed-from-pos' || body.action === 'backfill-from-pos')) {
    const { backfillGrandFormatAdminFromPos } = await import(
      '@/lib/services/grand-format-admin-backfill.service'
    );
    const report = await backfillGrandFormatAdminFromPos({
      userId: auth.userId,
      userName: auth.userName,
      dryRun: body.dryRun === true,
    });
    // Sync Admin → POS après création / restauration
    let sync: { synced?: number } | null = null;
    const shouldSync =
      body.dryRun !== true &&
      body.syncPos !== false &&
      (report.created > 0 || report.restored > 0);
    if (shouldSync) {
      sync = await CONFIG['grand-format'].syncAll(auth);
    }
    return NextResponse.json({
      ok: true,
      data: {
        report,
        sync,
        message: `${report.created} créée(s), ${report.restored} restaurée(s), ${report.preserved} conservée(s), ${report.pricesMissing} prix à compléter${report.errors ? `, ${report.errors} erreur(s)` : ''}`,
      },
    });
  }

  if (kind === 'finishing' && (body.action === 'seed-from-pos' || body.action === 'backfill-from-pos')) {
    const { backfillFinishingAdminFromCatalog } = await import(
      '@/lib/services/finishing-admin-backfill.service'
    );
    const report = await backfillFinishingAdminFromCatalog({
      userId: auth.userId,
      userName: auth.userName,
      dryRun: body.dryRun === true,
    });
    let sync: { synced?: number } | null = null;
    if (
      body.dryRun !== true &&
      body.syncPos !== false &&
      (report.created > 0 || report.restored > 0)
    ) {
      sync = await CONFIG.finishing.syncAll(auth);
    }
    return NextResponse.json({
      ok: true,
      data: {
        report,
        sync,
        message: `${report.created} créée(s), ${report.restored} restaurée(s), ${report.preserved} conservée(s), ${report.pricesMissing} prix à compléter`,
      },
    });
  }

  return NextResponse.json(
    { ok: false, error: { message: 'Action non supportée', code: 'BAD_ACTION' } },
    { status: 400 },
  );
}

export async function handlePricingTablePatch(
  kind: TableKind,
  id: string,
  body: Record<string, unknown>,
  auth: { userId?: string; userName?: string },
) {
  const cfg = CONFIG[kind];
  const model = cfg.model() as {
    update: (args: object) => Promise<unknown>;
    findUnique: (args: object) => Promise<{ status?: string; active?: boolean; visiblePOS?: boolean } | null>;
  };

  const data: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (key !== 'action') data[key] = body[key];
  }

  if (Object.keys(data).length) {
    // Prix renseigné → sortir du statut « à compléter »
    if (
      kind === 'grand-format' &&
      typeof data.pricePerM2 === 'number' &&
      (data.pricePerM2 as number) > 0 &&
      data.status == null
    ) {
      data.status = 'published';
      data.active = true;
      if (data.visiblePOS == null) data.visiblePOS = true;
    }
    await model.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
  }

  if (body.action === 'publish') {
    await model.update({ where: { id }, data: { status: 'published', active: true, updatedAt: new Date() } });
  }

  const updated = await model.findUnique({ where: { id } });
  const shouldSync =
    body.action === 'sync'
    || body.action === 'publish'
    || (
      Object.keys(data).length > 0
      && updated
      && (
        updated.status === 'published'
        || updated.status === 'archived'
        || updated.visiblePOS === false
        || data.visiblePOS === false
        || data.status === 'archived'
      )
    );

  if (shouldSync) {
    const synced = await cfg.sync(id, auth);
    return NextResponse.json({ ok: true, data: { synced, row: updated } });
  }

  return NextResponse.json({ ok: true, data: updated });
}

export async function handlePricingTableDelete(
  kind: TableKind,
  id: string,
  auth?: { userId?: string; userName?: string },
) {
  const cfg = CONFIG[kind];
  const model = cfg.model() as { update: (args: object) => Promise<unknown> };
  await model.update({
    where: { id },
    data: { status: 'archived', active: false, visiblePOS: false, updatedAt: new Date() },
  });
  // Archive / masque la carte Catalogue POS liée
  try {
    await cfg.sync(id, auth);
  } catch {
    /* best-effort */
  }
  return NextResponse.json({ ok: true, data: { archived: true } });
}

export function pricingTableError(error: unknown, fallback: string) {
  return NextResponse.json(
    { ok: false, error: { message: safeErrorMessage(error, fallback), code: 'ERROR' } },
    { status: 500 },
  );
}
