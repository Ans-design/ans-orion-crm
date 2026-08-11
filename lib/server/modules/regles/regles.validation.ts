import { z } from 'zod';

export const reglesSyncActionSchema = z.object({
  action: z.literal('sync'),
});

export const createBusinessRuleSchema = z.object({
  family: z.string().max(80).optional(),
  articleId: z.string().max(80).optional().nullable(),
  ruleKey: z.string().min(1).max(120),
  ruleName: z.string().min(1).max(200),
  ruleType: z.string().min(1).max(60),
  condition: z.record(z.unknown()).optional().default({}),
  action: z.record(z.unknown()).optional().default({}),
  message: z.string().max(2000).optional().nullable(),
  priority: z.coerce.number().int().min(0).max(9999).optional(),
  active: z.boolean().optional(),
  connected: z.boolean().optional(),
});

export type CreateBusinessRuleInput = z.infer<typeof createBusinessRuleSchema>;

export const updateBusinessRuleSchema = z.object({
  ruleName: z.string().min(1).max(200).optional(),
  ruleType: z.string().min(1).max(60).optional(),
  condition: z.record(z.unknown()).optional(),
  action: z.record(z.unknown()).optional(),
  message: z.string().max(2000).optional().nullable(),
  priority: z.coerce.number().int().min(0).max(9999).optional(),
  active: z.boolean().optional(),
  connected: z.boolean().optional(),
  family: z.string().max(80).optional(),
  articleId: z.string().max(80).optional().nullable(),
  reason: z.string().max(500).optional(),
});

export const reglesVersionsQuerySchema = z.object({
  entityType: z.string().max(80).optional().default(''),
  entityId: z.string().max(64).optional().default(''),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export type UpdateBusinessRuleInput = z.infer<typeof updateBusinessRuleSchema>;
