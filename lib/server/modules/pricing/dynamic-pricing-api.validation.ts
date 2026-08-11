import { z } from 'zod';

export const dynamicPricingSyncActionSchema = z.object({
  action: z.literal('sync'),
});

export const dynamicPricingArticleActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('publish') }),
  z.object({ action: z.literal('unpublish') }),
  z.object({
    action: z.literal('migrate-from-2026'),
    config: z.record(z.unknown()).optional(),
    dryRun: z.boolean().optional(),
  }),
]);

const tierRowSchema = z.object({
  id: z.string().optional(),
  minQty: z.coerce.number().positive().min(0.01),
  maxQty: z.union([z.coerce.number().positive().min(0.01), z.null()]).optional().default(null),
  unitPrice: z.union([z.coerce.number().min(0), z.null()]).optional().default(null),
  discountPercent: z.coerce.number().min(0).max(100),
  active: z.boolean().optional(),
});

/**
 * Schéma PATCH aligné sur les payloads UI réels (article-pricing-inline-sections).
 * Alias acceptés : priceImpact↔priceModifier, multiplier↔surchargePercent, unitPrice↔prixM2.
 */
export const dynamicPricingPatchSchema = z.discriminatedUnion('section', [
  z.object({
    section: z.literal('profile'),
    prixBase: z.coerce.number().min(0).nullable().optional(),
    prixM2: z.coerce.number().min(0).nullable().optional(),
    prixCm2: z.coerce.number().min(0).nullable().optional(),
    qtyMin: z.coerce.number().positive().min(0.01).nullable().optional(),
  }),
  z.object({
    section: z.literal('tiers'),
    tiers: z.array(tierRowSchema).optional().default([]),
    variantKey: z.string().max(120).optional(),
  }),
  z.object({
    section: z.literal('optionGroup'),
    groupId: z.string().min(1),
    label: z.string().max(200).optional(),
    visiblePos: z.boolean().optional(),
    active: z.boolean().optional(),
    required: z.boolean().optional(),
    sortOrder: z.coerce.number().int().optional(),
    impactsPrice: z.boolean().optional(),
    impactsStock: z.boolean().optional(),
    impactsProduction: z.boolean().optional(),
    isInformational: z.boolean().optional(),
  }),
  z.object({
    section: z.literal('optionValue'),
    groupId: z.string().min(1),
    valueId: z.string().min(1),
    label: z.string().max(200).optional(),
    /** Alias UI principal */
    priceModifier: z.coerce.number().optional(),
    /** Alias legacy / docs */
    priceImpact: z.coerce.number().optional(),
    forcePrice: z.boolean().optional(),
    active: z.boolean().optional(),
    sortOrder: z.coerce.number().int().optional(),
  }),
  z.object({
    section: z.literal('urgency'),
    ruleId: z.string().min(1),
    label: z.string().max(200).optional(),
    /** Alias UI principal */
    surchargePercent: z.coerce.number().min(0).optional(),
    /** Alias legacy */
    multiplier: z.coerce.number().min(0).optional(),
    requiresValidation: z.boolean().optional(),
    active: z.boolean().optional(),
    sortOrder: z.coerce.number().int().optional(),
  }),
  z.object({
    section: z.literal('material'),
    materialId: z.string().min(1),
    label: z.string().max(200).optional(),
    prixM2: z.coerce.number().min(0).nullable().optional(),
    prixCm2: z.coerce.number().min(0).nullable().optional(),
    /** Alias legacy */
    unitPrice: z.coerce.number().min(0).optional(),
    active: z.boolean().optional(),
  }),
  z.object({
    section: z.literal('formula'),
    label: z.string().max(200).optional(),
    simpleFormula: z.string().trim().max(2000).optional(),
    source: z.string().max(80).optional(),
    blocks: z
      .array(
        z.object({
          id: z.string().min(1),
          kind: z.string().min(1),
          enabled: z.boolean(),
          value: z.union([z.coerce.number(), z.null()]).optional(),
          label: z.string().max(200).optional(),
        }),
      )
      .min(1)
      .max(40),
  }),
  z.object({
    section: z.literal('formulaExpression'),
    expression: z.string().trim().min(1).max(8000),
    label: z.string().max(200).optional(),
  }),
]);

/** Normalise les alias avant appel service. */
export function normalizeDynamicPricingPatch(
  body: z.infer<typeof dynamicPricingPatchSchema>,
): z.infer<typeof dynamicPricingPatchSchema> {
  if (body.section === 'optionValue') {
    const priceModifier = body.priceModifier ?? body.priceImpact;
    return { ...body, priceModifier, priceImpact: priceModifier };
  }
  if (body.section === 'urgency') {
    const surchargePercent = body.surchargePercent ?? body.multiplier;
    return { ...body, surchargePercent, multiplier: surchargePercent };
  }
  if (body.section === 'material') {
    const prixM2 = body.prixM2 ?? body.unitPrice ?? null;
    return { ...body, prixM2: prixM2 as number | null | undefined };
  }
  return body;
}

export const dynamicPricingComparePostSchema = z.object({
  action: z.enum(['pilot', 'migrate-pilots']).optional(),
  articleId: z.string().min(1).max(80).optional(),
  qty: z.coerce.number().min(1).optional().default(100),
  config: z.record(z.unknown()).optional(),
  dryRun: z.boolean().optional(),
});
