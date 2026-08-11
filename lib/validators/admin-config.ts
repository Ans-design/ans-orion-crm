import { z } from 'zod';

export const rollbackConfigVersionSchema = z.object({
  version: z.coerce.number().int().min(1),
});

export const updateFiscalConfigSchema = z.object({
  cnapsRate: z.number().min(0).max(100).optional(),
  ostieRate: z.number().min(0).max(100).optional(),
  fmfpRate: z.number().min(0).max(100).optional(),
  irsaRate: z.number().min(0).max(100).optional(),
  tvaRate: z.number().min(0).max(100).optional(),
  hsRateMGA: z.number().min(0).optional(),
  currency: z.string().min(1).max(8).optional(),
  labelCnaps: z.string().min(1).max(40).optional(),
  labelOstie: z.string().min(1).max(40).optional(),
});

export const createArticleFromTemplateSchema = z.object({
  articleId: z.string().trim().min(1).max(80),
  articleLabel: z.string().trim().max(200).optional(),
});

export const updateBrandingConfigSchema = z.object({
  companyName: z.string().trim().min(1).max(120).optional(),
  companySubtitle: z.string().trim().max(120).optional(),
  contactEmail: z.string().trim().email().max(255).optional(),
  showPublicVersion: z.boolean().optional(),
  logoUrl: z.string().trim().max(2000).nullable().optional(),
});

export const openCaisseSessionSchema = z.object({
  openingFloat: z.coerce.number().min(0).optional().default(0),
});

/** Noyau minimal d'un snapshot backoffice (articles + chips obligatoires). */
export const adminConfigSnapshotSchema = z.object({
  version: z.coerce.number().int().min(0).optional(),
  status: z.enum(['draft', 'published']).optional(),
  updatedAt: z.string().optional(),
  articles: z.record(
    z.string(),
    z.object({ id: z.string().min(1) }).passthrough(),
  ),
  chips: z.record(
    z.string(),
    z.object({ id: z.string().min(1) }).passthrough(),
  ),
  featureFlags: z.record(z.string(), z.record(z.unknown())).optional(),
  variables: z.record(z.string(), z.record(z.unknown())).optional(),
  productPreviews: z.record(z.string(), z.record(z.unknown())).optional(),
}).passthrough();

export const adminConfigImportSchema = z.object({
  draft: adminConfigSnapshotSchema.optional(),
  published: adminConfigSnapshotSchema.optional(),
}).refine(
  (data) => Boolean(data.draft ?? data.published),
  { message: 'JSON invalide — articles et chips requis' },
);
