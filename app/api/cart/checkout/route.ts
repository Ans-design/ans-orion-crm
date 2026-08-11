export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { isFullAccessRole } from '@/lib/auth/permissions';
import { validateCartStock } from '@/lib/cart-stock-validation';
import { logPosAudit } from '@/lib/pos-audit';
import { ApiError } from '@/lib/server/http/api-error';
import { ok } from '@/lib/server/http/api-response';
import { withAuthApi, type AuthApiContext } from '@/lib/server/auth/with-auth-api';
import { parseBody } from '@/lib/server/validation/common';
import { checkoutCartSchema } from '@/lib/validators/cart';
import {
  clearUserCart,
  computeCartTotals,
  checkoutCommandeFromCart,
  checkoutFactureFromCart,
  saveUserCart,
  validateCartLines,
  type CartLineInput,
  type CartMeta,
} from '@/lib/services/cart-service';

async function handleCheckout(auth: AuthApiContext, body: unknown) {
  const parsed = parseBody(checkoutCartSchema, body, 'cart/checkout POST');
  if (!parsed.ok) return parsed.response;

  const { action, items = [], meta = {} } = parsed.data;

  if (action === 'clear') {
    await clearUserCart(auth.userId, auth.userName);
    return ok({ action: 'clear' as const });
  }

  if (items.length === 0) {
    throw ApiError.badRequest('Le panier est vide');
  }

  const validated = await validateCartLines(items as CartLineInput[]);
  const totals = computeCartTotals(validated, meta as CartMeta);

  if (action === 'commande' || action === 'facture') {
    if (!isFullAccessRole(auth.role)) {
      throw ApiError.forbidden(
        'Conversion directe interdite — créez un devis puis enregistrez l\'acompte pour confirmer la commande.',
      );
    }
    const stockIssues = await validateCartStock(validated, auth.role);
    if (stockIssues.length > 0) {
      throw ApiError.conflict(
        `Stock insuffisant — ${stockIssues.map((i) => `${i.name}: ${i.message}`).join(' · ')}`,
        stockIssues,
      );
    }
  }

  if (action === 'draft') {
    await saveUserCart(auth.userId, validated, meta as CartMeta, {
      userName: auth.userName,
      action: 'CART_DRAFT',
    });
    await logPosAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'CART_DRAFT',
      entity: 'Panier',
      entityLabel: 'Brouillon enregistré',
      details: { count: validated.length },
    });
    return ok({ action: 'draft' as const, items: validated, totals });
  }

  if (action === 'devis') {
    if (!(meta as CartMeta).clientId) {
      throw ApiError.badRequest('Sélectionnez un client CRM avant de créer un devis');
    }
    const { createDevisFromCart } = await import('@/lib/services/cart-service');
    const devis = await createDevisFromCart(validated, meta as CartMeta, auth.userId, auth.userName);
    await clearUserCart(auth.userId, auth.userName);
    return ok({ action: 'devis' as const, devis, totals });
  }

  if (action === 'commande') {
    const { devis, commande } = await checkoutCommandeFromCart(
      validated,
      meta as CartMeta,
      auth.userId,
      auth.userName,
    );
    await clearUserCart(auth.userId, auth.userName);
    return ok({ action: 'commande' as const, devis, commande, totals });
  }

  if (action === 'facture') {
    const { devis, commande, facture, factureCreated } = await checkoutFactureFromCart(
      validated,
      meta as CartMeta,
      auth.userId,
      auth.userName,
    );
    await clearUserCart(auth.userId, auth.userName);
    return ok({
      action: 'facture' as const,
      devis,
      commande,
      facture,
      factureCreated,
      totals,
    });
  }

  throw ApiError.badRequest('Action inconnue');
}

export async function POST(req: NextRequest) {
  return withAuthApi(
    'cart/checkout POST',
    async (auth, request) => handleCheckout(auth, await request.json()),
    { permission: 'pos:use' },
  )(req);
}
