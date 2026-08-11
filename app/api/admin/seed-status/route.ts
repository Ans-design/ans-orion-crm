export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { withTimeout } from '@/lib/with-timeout';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const auth = await requirePermission('config:publish');
  if ('error' in auth) return auth.error;

  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 5000, 'seed_status_db');

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
    ] = await Promise.all([
      prisma.user.count(),
      prisma.client.count(),
      prisma.devis.count(),
      prisma.commande.count(),
      prisma.facture.count(),
      prisma.auditLog.count(),
      prisma.employee.count().catch(() => 0),
      prisma.stockItem.count().catch(() => 0),
      prisma.machine.count().catch(() => 0),
      prisma.supplier.count().catch(() => 0),
    ]);

    const checks = {
      users: users >= 2,
      clients: clients >= 5,
      commandes: commandes >= 1,
      devis: devis >= 1,
      auditLogs: auditLogs >= 1,
      employees: employees >= 5,
      stock: stockItems >= 1,
      machines: machines >= 1,
    };

    const score = Object.values(checks).filter(Boolean).length;
    const total = Object.keys(checks).length;
    const ready = score >= 6;

    return NextResponse.json({
      ok: true,
      seed: {
        ready,
        score: `${score}/${total}`,
        checks,
        hint: ready
          ? 'Seed production OK'
          : 'Exécutez : DATABASE_URL=postgresql://... npm run seed:production',
      },
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
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erreur seed status',
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
