export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { isCartBusinessError } from '@/lib/cart-config-sanitize';
import { ApiError } from '@/lib/server/http/api-error';
import { ok } from '@/lib/server/http/api-response';
import { withAuthApi, type AuthApiContext } from '@/lib/server/auth/with-auth-api';
import { parseBody } from '@/lib/server/validation/common';
import { cartLineSchema, saveCartSchema } from '@/lib/validators/cart';
import { z } from 'zod';
import {
  clearUserCart,
  computeCartTotals,
  loadUserCart,
  saveUserCart,
  validateCartLines,
  type CartLineInput,
} from '@/lib/services/cart-service';

const cartPreviewSchema = z.object({
  items: z.array(cartLineSchema).max(100).default([]),
  meta: z.record(z.unknown()).optional(),
});

/** GET — panier utilisateur avec prix recalculés côté serveur */
export const GET = withAuthApi(
  'cart GET',
  async (auth: AuthApiContext) => {
    try {
      const { items, meta } = await loadUserCart(auth.userId);
      const totals = computeCartTotals(items, meta);
      return ok({ items, meta, totals, userId: auth.userId });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg && isCartBusinessError(msg)) throw ApiError.badRequest(msg);
      throw error;
    }
  },
  { permission: 'pos:use' },
);

/** PUT — synchronise le panier (validation prix serveur obligatoire) */
export async function PUT(req: NextRequest) {
  return withAuthApi(
    'cart PUT',
    async (auth, request) => {
      const parsed = parseBody(saveCartSchema, await request.json(), 'cart PUT');
      if (!parsed.ok) return parsed.response;

      try {
        const { items, meta } = parsed.data;
        const validated = await saveUserCart(
          auth.userId,
          items as CartLineInput[],
          meta ?? {},
          { userName: auth.userName, action: 'CART_UPDATE' },
        );
        const totals = computeCartTotals(validated, meta ?? {});
        return ok({ items: validated, meta: meta ?? {}, totals });
      } catch (error) {
        const msg = error instanceof Error ? error.message : '';
        if (msg && isCartBusinessError(msg)) throw ApiError.badRequest(msg);
        throw error;
      }
    },
    { permission: 'pos:use' },
  )(req);
}

/** DELETE — vide le panier utilisateur */
export const DELETE = withAuthApi(
  'cart DELETE',
  async (auth: AuthApiContext) => {
    await clearUserCart(auth.userId, auth.userName);
    return ok({ cleared: true });
  },
  { permission: 'pos:use' },
);

/** POST — valide des lignes sans persister (preview prix) */
export async function POST(req: NextRequest) {
  return withAuthApi(
    'cart POST',
    async (_auth, request) => {
      const parsed = parseBody(cartPreviewSchema, await request.json(), 'cart POST');
      if (!parsed.ok) return parsed.response;

      try {
        const items = Array.isArray(parsed.data.items) ? parsed.data.items : [];
        const validated = await validateCartLines(items as CartLineInput[]);
        const totals = computeCartTotals(validated, parsed.data.meta ?? {});
        return ok({ items: validated, totals });
      } catch (error) {
        const msg = error instanceof Error ? error.message : '';
        if (msg && isCartBusinessError(msg)) throw ApiError.badRequest(msg);
        throw error;
      }
    },
    { permission: 'pos:use' },
  )(req);
}
