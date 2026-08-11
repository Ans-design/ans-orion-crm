export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-utils';

/** Statut import fusion métier — admin/manager */
export async function GET() {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  try {
    const [
      materials,
      grammages,
      salePrices,
      salePricesAuto,
      supplierPrices,
      stockGf,
      anomalies,
      reservations,
    ] = await Promise.all([
      prisma.materialCatalog.count(),
      prisma.grammageCatalog.count(),
      prisma.salePrice2026.count(),
      prisma.salePrice2026.count({ where: { actif: true, priceType: 'auto' } }),
      prisma.supplierPrice.count({ where: { actif: true } }),
      prisma.stockItem.count({ where: { category: 'GrandFormat', actif: true } }),
      prisma.importAnomaly.count({ where: { resolved: false } }),
      prisma.stockReservation.count({ where: { status: 'active' } }),
    ]);

    return NextResponse.json({
      ok: true,
      fusion: {
        materials,
        grammages,
        salePrices,
        salePricesAuto,
        supplierPrices,
        stockGrandFormat: stockGf,
        anomaliesOpen: anomalies,
        activeReservations: reservations,
      },
      rules: {
        salePriceSource: 'PRIX 2026 (SalePrice2026)',
        purchasePriceSource: 'Fournisseurs (SupplierPrice)',
        stockAvailable: 'quantity - reservedQty',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Tables fusion absentes — exécutez npm run db:push puis npm run import:fusion',
        error: error instanceof Error ? error.message : 'unknown',
      },
      { status: 503 },
    );
  }
}
