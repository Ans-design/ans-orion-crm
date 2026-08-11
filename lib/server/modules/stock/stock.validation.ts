import { z } from 'zod';

export const stockCategorySchema = z.enum(['vente_directe', 'hybride', 'matiere_interne', 'maintenance_piece']);

export const createStockItemSchema = z.object({
  sku: z.string().max(50).optional(),
  label: z.string().min(1).max(200),
  category: z.string().max(50).default('Papier'),
  stockCategory: stockCategorySchema.default('matiere_interne'),
  family: z.string().max(80).optional().nullable(),
  subFamily: z.string().max(80).optional().nullable(),
  brand: z.string().max(80).optional().nullable(),
  supplierRef: z.string().max(100).optional().nullable(),
  additionalCost: z.number().min(0).optional().nullable(),
  vatRate: z.number().min(0).max(100).optional().nullable(),
  machineCompatible: z.string().max(120).optional().nullable(),
  sizeLabel: z.string().max(30).optional().nullable(),
  capacity: z.string().max(30).optional().nullable(),
  vendableDirectement: z.boolean().default(false),
  paperType: z.string().max(50).optional().nullable(),
  grammage: z.string().max(20).optional().nullable(),
  thickness: z.string().max(20).optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  formatLabel: z.string().max(50).optional().nullable(),
  characteristic: z.string().max(100).optional().nullable(),
  unit: z.string().max(20).default('feuille'),
  unitDisplay: z.string().max(30).optional().nullable(),
  unitStandard: z.string().max(30).optional().nullable(),
  conversionFactor: z.number().min(0).optional().nullable(),
  stockKind: z.string().max(30).optional().nullable(),
  quantity: z.number().min(0).default(0),
  minQty: z.number().min(0).default(50),
  maxQty: z.number().min(0).optional().nullable(),
  unitCost: z.number().min(0).optional().nullable(),
  salePrice: z.number().min(0).optional().nullable(),
  marginPct: z.number().optional().nullable(),
  discountPct: z.number().optional().nullable(),
  supplier: z.string().max(200).optional().nullable(),
  lengthM: z.number().min(0).optional().nullable(),
  widthM: z.number().min(0).optional().nullable(),
  yieldM2: z.number().min(0).optional().nullable(),
  yieldUnit: z.string().max(20).optional().nullable(),
  materialKey: z.string().max(80).optional().nullable(),
  autoSku: z.boolean().default(true),
  linkMaterial: z.boolean().default(false),
  supplierId: z.string().optional().nullable(),
  skuManual: z.boolean().default(false),
  skuManualReason: z.string().max(200).optional().nullable(),
  basePrintPrice: z.number().min(0).optional().nullable(),
  maxPrice: z.number().min(0).optional().nullable(),
  minMargin: z.number().optional().nullable(),
  visiblePos: z.boolean().default(false),
  impactsPrice: z.boolean().default(true),
  impactsStock: z.boolean().default(true),
  usableProduction: z.boolean().default(true),
  linkMachine: z.boolean().default(false),
  site: z.string().max(50).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.skuManual && !data.skuManualReason?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Justification obligatoire pour modification manuelle du SKU',
      path: ['skuManualReason'],
    });
  }
  if (data.vendableDirectement && (data.salePrice == null || data.salePrice <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Prix de vente obligatoire si vendable directement',
      path: ['salePrice'],
    });
  }
  if (data.stockCategory === 'vente_directe' && (data.salePrice == null || data.salePrice <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Prix de vente obligatoire pour la catégorie Vente directe',
      path: ['salePrice'],
    });
  }
  if (
    (data.stockCategory === 'matiere_interne' || data.stockCategory === 'hybride') &&
    data.unitDisplay &&
    data.unitDisplay !== data.unit &&
    (data.conversionFactor == null || data.conversionFactor <= 0)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Facteur de conversion requis quand l\'unité commerciale diffère de l\'unité stock',
      path: ['conversionFactor'],
    });
  }
});

export const generateSkuSchema = z.object({
  label: z.string().min(1),
  grammage: z.string().optional().nullable(),
  thickness: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  formatLabel: z.string().optional().nullable(),
  paperType: z.string().optional().nullable(),
  widthM: z.number().optional().nullable(),
  stockKind: z.string().optional().nullable(),
  characteristic: z.string().optional().nullable(),
  unitDisplay: z.string().optional().nullable(),
  conversionFactor: z.number().optional().nullable(),
  machineCompatible: z.string().optional().nullable(),
});

export const adjustStockSchema = z.object({
  type: z.enum(['entree', 'sortie', 'ajustement']),
  quantity: z.number().positive(),
  notes: z.string().max(500).optional(),
  reference: z.string().max(100).optional(),
});

export const updateStockItemSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  category: z.string().max(50).optional(),
  stockCategory: stockCategorySchema.optional(),
  vendableDirectement: z.boolean().optional(),
  paperType: z.string().max(100).optional().nullable(),
  grammage: z.string().max(50).optional().nullable(),
  thickness: z.string().max(50).optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  formatLabel: z.string().max(50).optional().nullable(),
  unit: z.string().max(30).optional(),
  unitDisplay: z.string().max(30).optional().nullable(),
  unitStandard: z.string().max(30).optional().nullable(),
  conversionFactor: z.number().min(0).optional().nullable(),
  minQty: z.number().min(0).optional(),
  maxQty: z.number().min(0).optional().nullable(),
  unitCost: z.number().min(0).optional().nullable(),
  salePrice: z.number().min(0).optional().nullable(),
  marginPct: z.number().optional().nullable(),
  supplier: z.string().max(200).optional().nullable(),
  reservedQty: z.number().min(0).optional(),
  lengthM: z.number().min(0).optional().nullable(),
  widthM: z.number().min(0).optional().nullable(),
  yieldM2: z.number().min(0).optional().nullable(),
  yieldUnit: z.string().max(20).optional().nullable(),
});

export const stockCheckSchema = z.object({
  articleId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).optional(),
  configuration: z.record(z.unknown()).optional(),
});

export type CreateStockItemInput = z.infer<typeof createStockItemSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type UpdateStockItemInput = z.infer<typeof updateStockItemSchema>;
export type StockCheckInput = z.infer<typeof stockCheckSchema>;

export type StockPatchResult =
  | { ok: true; kind: 'adjust'; data: AdjustStockInput }
  | { ok: true; kind: 'update'; data: UpdateStockItemInput }
  | { ok: false; error: string };

export function parseStockPatchBody(body: unknown): StockPatchResult {
  const movement = adjustStockSchema.safeParse(body);
  if (movement.success) {
    return { ok: true, kind: 'adjust', data: movement.data };
  }
  const update = updateStockItemSchema.safeParse(body);
  if (update.success) {
    return { ok: true, kind: 'update', data: update.data };
  }
  const msg = movement.error.errors.map((e) => e.message).join(', ')
    || update.error.errors.map((e) => e.message).join(', ')
    || 'Corps PATCH stock invalide';
  return { ok: false, error: msg };
}

export type StockListQuery = {
  category: string;
  stockCategory: string;
  critical: boolean;
  outOfStock: boolean;
  vendable: boolean;
  linkedMaterial: string;
  search: string;
  page?: number;
  pageSize?: number;
  /** Autocomplete léger — retourne champs réduits, max 30 */
  suggest?: boolean;
  trash?: boolean;
};
