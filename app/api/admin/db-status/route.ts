export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-utils';
import { withTimeout } from '@/lib/with-timeout';

export async function GET() {
  const auth = await requirePermission('config:publish');
  if ('error' in auth) return auth.error;

  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 5000, 'db_status');

    const [
      users,
      clients,
      devis,
      commandes,
      factures,
      auditLogs,
      employees,
      stockItems,
      machines,
      suppliers,
      tarifs,
      paiements,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.client.count({ where: { archived: false } }),
      prisma.devis.count(),
      prisma.commande.count(),
      prisma.facture.count(),
      prisma.auditLog.count(),
      prisma.employee.count().catch(() => 0),
      prisma.stockItem.count().catch(() => 0),
      prisma.machine.count().catch(() => 0),
      prisma.supplier.count().catch(() => 0),
      prisma.tarif.count().catch(() => 0),
      prisma.paiement.count().catch(() => 0),
    ]);

    const seeded = users >= 2 && clients >= 5 && commandes >= 1;

    return NextResponse.json({
      ok: true,
      database: 'connected',
      counts: {
        users,
        clients,
        devis,
        commandes,
        factures,
        auditLogs,
        employees,
        stockItems,
        machines,
        suppliers,
        products: tarifs,
        payments: paiements,
      },
      seed: {
        ready: seeded,
        status: seeded ? 'complete' : 'incomplete',
        hint: seeded
          ? 'Données production présentes'
          : 'Exécutez npm run seed:production avec DATABASE_URL Neon',
      },
      modules: {
        pos: tarifs > 0,
        stock: stockItems > 0,
        production: machines > 0,
        rh: employees > 0,
      },
      env: {
        useProductionDb: process.env.USE_PRODUCTION_DB === 'true',
        nextauthUrl: process.env.NEXTAUTH_URL ?? null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[db-status]', error);
    return NextResponse.json(
      {
        ok: false,
        database: 'error',
        error: error instanceof Error ? error.message : 'Erreur DB',
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
