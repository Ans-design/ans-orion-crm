import type { ValidatedCartLine } from '@/lib/services/cart-service';
import { resolveStockAvailability } from '@/lib/services/stock-service';

export type CartStockIssue = {
  articleId: string;
  name: string;
  status: string;
  message: string;
};

/** Vérifie le stock papier pour chaque ligne panier (rupture / partiel). */
export async function validateCartStock(
  items: ValidatedCartLine[],
  userRole?: string | null,
): Promise<CartStockIssue[]> {
  const issues: CartStockIssue[] = [];

  for (const item of items) {
    const config = item.config ?? {};
    const paperType = String(config.paperType || config.matiere || '').trim();
    const grammage = String(config.paperWeight || config.grammage || '').trim();
    if (!paperType || !grammage || grammage.toLowerCase().includes('personnalisé')) continue;

    const result = await resolveStockAvailability({
      articleId: item.articleId,
      quantity: item.quantity,
      configuration: config,
      userRole: userRole ?? undefined,
    });

    if (
      (result.status === 'OUT_OF_STOCK' || result.status === 'PARTIAL_OUT_OF_STOCK')
      && !result.canCreateOrder
    ) {
      issues.push({
        articleId: item.articleId,
        name: item.name,
        status: result.status,
        message: result.message,
      });
    }
  }

  return issues;
}
