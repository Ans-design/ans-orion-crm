import { z } from 'zod';

export const patchChipGroupSchema = z.object({
  impactsPrice: z.boolean().optional(),
  impactsStock: z.boolean().optional(),
  impactsProduction: z.boolean().optional(),
  isInformational: z.boolean().optional(),
  visiblePos: z.boolean().optional(),
  active: z.boolean().optional(),
  required: z.boolean().optional(),
  label: z.string().trim().max(200).optional(),
});

export const patchChipValueSchema = z.object({
  active: z.boolean().optional(),
  label: z.string().trim().max(200).optional(),
  priceModifier: z.number().optional(),
});
