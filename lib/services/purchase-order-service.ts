import { prisma } from '@/lib/prisma';
import { adjustStock } from '@/lib/services/stock-service';
import { syncMaterialFromStockItem } from '@/lib/server/modules/materials/material-stock-sync.service';
import { purchaseQtyToStockQty } from '@/lib/data/stock-unit-presets';
import { PRISMA_TX_OPTIONS } from '@/lib/prisma-transaction';

type PurchaseLine = {
  id: string;
  stockItemId: string | null;
  label: string;
  qty: number;
  unitCost: number;
  receivedQty: number;
  purchaseUnit?: string | null;
  conversionFactor?: number | null;
};

export async function receivePurchaseOrder(orderId: string, userId?: string, userName?: string) {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findUnique({
      where: { id: orderId },
      include: { lignes: true, supplier: true },
    });
    if (!order) throw new Error('Commande achat introuvable');
    if (order.statut === 'Reçu') throw new Error('Déjà reçu');
    if (order.statut === 'Annulé') throw new Error('Commande annulée');
    if (order.statut === 'En réception') throw new Error('Réception déjà en cours');

    // Claim atomique : exclut les doubles clics concurrent (statut exclusif).
    const claim = await tx.purchaseOrder.updateMany({
      where: {
        id: orderId,
        statut: { in: ['Brouillon', 'Commandé', 'Reçu partiel'] },
      },
      data: { statut: 'En réception' },
    });
    if (claim.count === 0) {
      throw new Error('Réception déjà en cours ou commande déjà reçue');
    }

    const syncedStockIds = new Set<string>();

    for (const ligne of order.lignes as PurchaseLine[]) {
      const remaining = ligne.qty - ligne.receivedQty;
      if (remaining <= 0 || !ligne.stockItemId) continue;

      const stockItem = await tx.stockItem.findUnique({ where: { id: ligne.stockItemId } });
      if (!stockItem) continue;

      const qtyToAdd = purchaseQtyToStockQty({
        purchaseQty: remaining,
        purchaseUnit: ligne.purchaseUnit,
        lineConversionFactor: ligne.conversionFactor,
        stockUnitDisplay: stockItem.unitDisplay ?? stockItem.unit,
        stockConversionFactor: stockItem.conversionFactor,
      });

      if (qtyToAdd > 0) {
        await adjustStock({
          stockItemId: ligne.stockItemId,
          type: 'entree',
          movementType: 'entree',
          quantity: qtyToAdd,
          // Une référence par ligne évite de fusionner deux lignes identiques.
          reference: `${order.numero}/${ligne.id}`,
          userId,
          userName,
          notes: `Réception achat ${order.numero}${ligne.purchaseUnit ? ` (${remaining} ${ligne.purchaseUnit})` : ''}`,
        }, tx);
        syncedStockIds.add(ligne.stockItemId);
      }

      const stockUpdate: Record<string, unknown> = {};
      if (ligne.unitCost > 0) stockUpdate.unitCost = ligne.unitCost;
      if (order.supplier?.name) stockUpdate.supplier = order.supplier.name;
      if (order.supplierId) stockUpdate.supplierId = order.supplierId;

      if (Object.keys(stockUpdate).length) {
        await tx.stockItem.update({
          where: { id: ligne.stockItemId },
          data: stockUpdate as Parameters<typeof tx.stockItem.update>[0]['data'],
        });
      }

      await tx.purchaseOrderLine.update({
        where: { id: ligne.id },
        data: { receivedQty: ligne.qty },
      });
    }

    const refreshed = await tx.purchaseOrder.findUnique({
      where: { id: orderId },
      include: { lignes: true },
    });

    const allReceived = refreshed?.lignes.every((l) => l.receivedQty >= l.qty) ?? false;
    const someReceived = refreshed?.lignes.some((l) => l.receivedQty > 0) ?? false;
    const nextStatut = allReceived ? 'Reçu' : someReceived ? 'Reçu partiel' : order.statut;

    const updatedOrder = await tx.purchaseOrder.update({
      where: { id: orderId },
      data: {
        statut: nextStatut,
        receivedAt: allReceived ? new Date() : order.receivedAt,
      },
      include: { supplier: true, lignes: true },
    });

    return { order: updatedOrder, syncedStockIds: [...syncedStockIds] };
  }, PRISMA_TX_OPTIONS);

  // Sync dérivée après commit : une erreur ne doit pas annuler la réception.
  for (const stockId of result.syncedStockIds) {
    try {
      await syncMaterialFromStockItem(stockId);
    } catch (err) {
      console.warn('[purchase-order] sync matière:', err);
    }
  }

  return result.order;
}
