import { prisma } from '@/lib/prisma';
import {
  resolveStockNeedsForLigne,
  type DevisLigneForReservation,
} from '@/lib/services/stock-reservation-service';
import { stockAvailable } from '@/lib/services/stock-service';
import { CATALOGUE } from '@/lib/data/catalogue';

export type CommandeStockStatus = {
  requiresStock: boolean;
  stockReady: boolean;
  activeReservations: number;
  blockers: string[];
};

function ligneCategory(articleId: string | null | undefined): string {
  if (!articleId) return '';
  const article = CATALOGUE.find((a) => a.id === articleId);
  return article?.category ?? (articleId.startsWith('gf-') ? 'grand_format' : '');
}

/** Évalue si le stock est prêt pour lancer la production. */
export async function assessCommandeStock(commandeId: string): Promise<CommandeStockStatus> {
  const [lignes, activeReservations] = await Promise.all([
    prisma.commandeLigne.findMany({ where: { commandeId } }),
    prisma.stockReservation.count({ where: { commandeId, status: 'active' } }),
  ]);

  if (activeReservations > 0) {
    return {
      requiresStock: true,
      stockReady: true,
      activeReservations,
      blockers: [],
    };
  }

  const blockers: string[] = [];
  let requiresStock = false;

  for (const ligne of lignes) {
    const input: DevisLigneForReservation = {
      articleId: ligne.articleId ?? '',
      articleLabel: ligne.articleLabel,
      category: ligneCategory(ligne.articleId),
      configSnapshot: ligne.configSnapshot,
      quantity: ligne.quantity,
    };
    const needs = await resolveStockNeedsForLigne(input, prisma);
    if (needs.length === 0) continue;

    requiresStock = true;
    for (const need of needs) {
      const item = await prisma.stockItem.findUnique({ where: { id: need.stockItemId } });
      if (!item) {
        blockers.push(`Stock introuvable : ${need.label}`);
        continue;
      }
      const available = stockAvailable(item);
      if (need.quantity > available) {
        blockers.push(
          `${item.label} : ${Math.floor(available)} ${item.unit} dispo / ${need.quantity} requis`,
        );
      }
    }
  }

  const uniqueBlockers = [...new Set(blockers)];

  if (!requiresStock) {
    return { requiresStock: false, stockReady: true, activeReservations: 0, blockers: [] };
  }

  if (uniqueBlockers.length > 0) {
    return {
      requiresStock: true,
      stockReady: false,
      activeReservations: 0,
      blockers: uniqueBlockers,
    };
  }

  return {
    requiresStock: true,
    stockReady: false,
    activeReservations: 0,
    blockers: ['Réservez le stock (magasin) avant de lancer la production'],
  };
}

export function isCommandeStockReady(
  stock: Pick<CommandeStockStatus, 'stockReady'>,
): boolean {
  return stock.stockReady;
}
