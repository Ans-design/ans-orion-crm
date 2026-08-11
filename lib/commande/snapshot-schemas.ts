import { z } from 'zod';

export const PricingSnapshotSchema = z.object({
  unitPrice: z.number().nonnegative(),
  totalLigne: z.number().nonnegative(),
  currency: z.string().default('MGA'),
  formulaVersion: z.string().optional(),
  engine: z.string().optional(),
  materials: z.array(z.record(z.unknown())).optional(),
  capturedAt: z.string().optional(),
});

export const OrderItemSnapshotSchema = z.object({
  articleId: z.string().nullable().optional(),
  articleLabel: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  totalLigne: z.number().nonnegative(),
  configSummary: z.string(),
});

export const OrderConfigurationSnapshotSchema = z.object({
  version: z.literal(1),
  acceptedAt: z.string(),
  devisId: z.string(),
  devisNumero: z.string(),
  commercial: z.object({
    sousTotal: z.number(),
    remise: z.number(),
    totalHT: z.number(),
    totalTTC: z.number(),
    validUntil: z.string().nullable(),
  }),
  paymentSnapshot: z.record(z.unknown()),
  logisticsSnapshot: z.record(z.unknown()).optional(),
  clientSnapshot: z.record(z.unknown()),
  itemsSnapshot: z.array(OrderItemSnapshotSchema).min(1),
});

export type OrderConfigurationSnapshot = z.infer<typeof OrderConfigurationSnapshotSchema>;

export function parseOrderConfigurationSnapshot(raw: unknown): OrderConfigurationSnapshot | null {
  const r = OrderConfigurationSnapshotSchema.safeParse(raw);
  return r.success ? r.data : null;
}
