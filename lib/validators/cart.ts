import { z } from 'zod';
import { cuidSchema } from './common';

export const cartLineSchema = z.object({
  id: z.string().max(100).optional(),
  articleId: z.string().min(1).max(100),
  name: z.string().max(300).optional(),
  category: z.string().max(100).optional(),
  config: z.record(z.unknown()).default({}),
  quantity: z.number().int().min(1).max(1_000_000),
});

export const cartMetaSchema = z.object({
  remise: z.number().min(0).max(100).optional(),
  acomptePct: z.number().min(0).max(100).optional(),
  livraison: z.number().min(0).optional(),
  clientId: cuidSchema.optional().nullable(),
  validation: z.record(z.unknown()).optional(),
});

export const saveCartSchema = z.object({
  items: z.array(cartLineSchema).max(100),
  meta: cartMetaSchema.optional(),
});

export const checkoutCartSchema = z.object({
  action: z.enum(['draft', 'devis', 'commande', 'facture', 'clear']),
  items: z.array(cartLineSchema).max(100).optional(),
  meta: cartMetaSchema.optional(),
});
