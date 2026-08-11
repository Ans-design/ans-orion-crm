import { z } from 'zod';

export const appliedTierSnapshotSchema = z.object({
  source: z.enum(['db_discount', 'config_tier', 'db_tarif']),
  label: z.string().min(1),
  minQty: z.number().nullable(),
  maxQty: z.number().nullable(),
  unitPrice: z.number(),
  tierId: z.string().nullable().optional(),
  discountPercent: z.number().nullable().optional(),
});

export const materialStockSnapshotSchema = z.object({
  materialId: z.string().nullable(),
  stockItemId: z.string().nullable(),
  materialKey: z.string().nullable(),
  sku: z.string().nullable(),
  label: z.string().nullable(),
  purchasePrice: z.number().nullable(),
  basePrintPrice: z.number().nullable(),
  maxPrice: z.number().nullable(),
  publicationStatus: z.string().nullable(),
  unitDisplay: z.string().nullable(),
  unitStandard: z.string().nullable(),
  conversionFactor: z.number().nullable(),
  stockAvailable: z.number().nullable(),
  formulaVersion: z.union([z.number(), z.string()]).nullable(),
  publicationVersion: z.string().nullable(),
});

export const pricingSnapshotEnvelopeSchema = z.object({
  version: z.literal(1),
  calculatedAt: z.string(),
  priceSource: z.string().nullable(),
  formulaVersion: z.union([z.number(), z.string()]).nullable(),
  formulaExpression: z.string().nullable(),
  profileStatus: z.string().nullable(),
  dynamicEngine: z.boolean(),
  appliedTier: appliedTierSnapshotSchema.nullable(),
  prixUnitaire: z.number(),
  totalHT: z.number(),
  materialStock: materialStockSnapshotSchema.nullable().optional(),
});

export type PricingSnapshotEnvelopeValidated = z.infer<typeof pricingSnapshotEnvelopeSchema>;

export function parsePricingSnapshotEnvelope(raw: unknown): PricingSnapshotEnvelopeValidated | null {
  const parsed = pricingSnapshotEnvelopeSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function assertPricingSnapshotEnvelope(raw: unknown): PricingSnapshotEnvelopeValidated {
  return pricingSnapshotEnvelopeSchema.parse(raw);
}
