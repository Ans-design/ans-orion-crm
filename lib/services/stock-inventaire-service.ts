import { prisma } from '@/lib/prisma';
import { adjustStock } from '@/lib/services/stock-service';

export type InventaireLineInput = {
  stockItemId: string;
  countedQty: number;
};

export type InventaireResult = {
  sessionId: string;
  adjusted: number;
  skipped: number;
  errors: { stockItemId: string; error: string }[];
};

/** Compte physique : ajuste chaque ligne vers la quantité comptée (type inventaire). */
export async function applyPhysicalInventory(params: {
  lines: InventaireLineInput[];
  userId?: string;
  userName?: string;
  notes?: string;
}): Promise<InventaireResult> {
  const sessionId = `INV-${Date.now().toString(36).toUpperCase()}`;
  const errors: InventaireResult['errors'] = [];
  let adjusted = 0;
  let skipped = 0;

  for (const line of params.lines) {
    if (!Number.isFinite(line.countedQty) || line.countedQty < 0) {
      errors.push({ stockItemId: line.stockItemId, error: 'Quantité invalide' });
      continue;
    }
    const item = await prisma.stockItem.findUnique({
      where: { id: line.stockItemId },
      select: { id: true, quantity: true, reservedQty: true, actif: true },
    });
    if (!item || !item.actif) {
      errors.push({ stockItemId: line.stockItemId, error: 'Article introuvable' });
      continue;
    }
    if (item.quantity === line.countedQty) {
      skipped += 1;
      continue;
    }
    try {
      await adjustStock({
        stockItemId: line.stockItemId,
        type: 'ajustement',
        movementType: 'inventaire',
        quantity: line.countedQty,
        reference: `${sessionId}:${line.stockItemId}`,
        userId: params.userId,
        userName: params.userName,
        notes: params.notes?.trim() || `Inventaire physique ${sessionId}`,
      });
      adjusted += 1;
    } catch (e) {
      errors.push({
        stockItemId: line.stockItemId,
        error: e instanceof Error ? e.message : 'Échec ajustement',
      });
    }
  }

  return { sessionId, adjusted, skipped, errors };
}

export async function listInventaireCandidates(limit = 200) {
  return prisma.stockItem.findMany({
    where: { actif: true },
    orderBy: [{ category: 'asc' }, { label: 'asc' }],
    take: Math.min(200, Math.max(1, limit)),
    select: {
      id: true,
      sku: true,
      label: true,
      category: true,
      quantity: true,
      reservedQty: true,
      unit: true,
      minQty: true,
    },
  });
}
