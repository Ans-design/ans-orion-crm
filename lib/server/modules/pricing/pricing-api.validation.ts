import { z } from 'zod';

const boundedNumber = z.number().min(0).max(999_999_999);

export const globalPricingUpdateSchema = z.object({
  production: z.object({
    standard: boundedNumber.optional(),
    express48h: boundedNumber.optional(),
    superExpress24h: boundedNumber.optional(),
  }).partial().optional(),
  bat: z.object({
    digitalEmail: boundedNumber.optional(),
    sansBat: boundedNumber.optional(),
    physiquePapier: boundedNumber.optional(),
  }).partial().optional(),
  livraison: z.object({
    retraitAtelier: boundedNumber.optional(),
    emballageRenforce: boundedNumber.optional(),
    livraisonTana: boundedNumber.optional(),
    livraisonProvince: boundedNumber.optional(),
  }).partial().optional(),
  tvaDefault: z.number().min(0).max(100).optional(),
});

export const pricingCalculateSchema = z.object({
  articleId: z.string().min(1).max(80),
  config: z.record(z.unknown()).optional().default({}),
  options: z.record(z.unknown()).optional(),
});

const pricingOptionsFields = {
  prixForce: z.coerce.number().min(0).optional(),
  totalForce: z.coerce.number().min(0).optional(),
  priceReason: z.string().max(500).optional(),
  qty: z.coerce.number().min(1).optional(),
};

export const pricingSimulateSchema = z.object({
  articleId: z.string().min(1).max(80),
  config: z.record(z.unknown()).optional().default({}),
  /** POS : prix seul sans règles / formule / marge (beaucoup plus rapide). */
  lite: z.boolean().optional().default(false),
  ...pricingOptionsFields,
});

export const pricingResolveSchema = z.object({
  articleId: z.string().min(1).max(80),
  config: z.record(z.unknown()).optional().default({}),
  prixForce: pricingOptionsFields.prixForce,
  totalForce: pricingOptionsFields.totalForce,
  priceReason: pricingOptionsFields.priceReason,
});

/** Accepte alias article/configuration pour compat POS legacy */
export const posPricePreviewSchema = z.object({
  articleId: z.string().min(1).max(80).optional(),
  article: z.string().min(1).max(80).optional(),
  config: z.record(z.unknown()).optional(),
  configuration: z.record(z.unknown()).optional(),
  prixForce: pricingOptionsFields.prixForce,
  totalForce: pricingOptionsFields.totalForce,
  priceReason: pricingOptionsFields.priceReason,
}).transform((data) => ({
  articleId: data.articleId ?? data.article ?? '',
  config: data.config ?? data.configuration ?? {},
  prixForce: data.prixForce,
  totalForce: data.totalForce,
  priceReason: data.priceReason,
})).refine((d) => d.articleId.length > 0, { message: 'articleId requis' });

export type GlobalPricingUpdateInput = z.infer<typeof globalPricingUpdateSchema>;
export type PricingCalculateInput = z.infer<typeof pricingCalculateSchema>;
export type PricingSimulateInput = z.infer<typeof pricingSimulateSchema>;
export type PricingResolveInput = z.infer<typeof pricingResolveSchema>;
export type PosPricePreviewInput = z.infer<typeof posPricePreviewSchema>;

export const posStockCheckSchema = z.object({
  articleId: z.string().min(1).max(80).optional(),
  article: z.string().min(1).max(80).optional(),
  qty: z.coerce.number().min(1).optional(),
  quantity: z.coerce.number().min(1).optional(),
  config: z.record(z.unknown()).optional(),
  configuration: z.record(z.unknown()).optional(),
}).transform((data) => ({
  articleId: data.articleId ?? data.article ?? '',
  qty: data.qty ?? data.quantity ?? 1,
  config: data.config ?? data.configuration ?? {},
})).refine((d) => d.articleId.length > 0, { message: 'articleId requis' });

export type PosStockCheckInput = z.infer<typeof posStockCheckSchema>;
