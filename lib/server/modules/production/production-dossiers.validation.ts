import { z } from 'zod';

export const dossierListQuerySchema = z.object({
  statut: z.string().max(80).optional(),
  commandeId: z.string().max(80).optional(),
  stats: z.enum(['0', '1']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  etapeNom: z.string().max(80).optional(),
});

export const createDossierSchema = z.object({
  commandeId: z.string().min(1).max(80),
  priorite: z.string().max(40).optional(),
});

export const productionIncidentSchema = z.object({
  action: z.literal('incident').optional(),
  dossierId: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  severity: z.string().max(40).optional(),
  description: z.string().max(1000).nullable().optional(),
});

export const dossierPostBodySchema = z.union([
  productionIncidentSchema,
  createDossierSchema.extend({ action: z.literal('incident').optional() }),
]);

export const patchDossierEtapeSchema = z.object({
  etapeId: z.string().min(1).max(80),
  statut: z.string().max(80).optional(),
  responsable: z.string().max(80).optional(),
  commentaire: z.string().max(500).optional(),
  bloque: z.boolean().optional(),
  resolveIncidentId: z.string().max(80).optional(),
});

export type DossierListQuery = z.infer<typeof dossierListQuerySchema> & {
  page?: number;
  pageSize?: number;
  etapeNom?: string;
};

export function parseDossierListQuery(params: URLSearchParams): DossierListQuery {
  const page = Number(params.get('page') || '1');
  const pageSize = Number(params.get('pageSize') || params.get('limit') || '25');
  return {
    statut: params.get('statut') || undefined,
    commandeId: params.get('commande') || params.get('commandeId') || undefined,
    stats: params.get('stats') === '1' ? '1' : undefined,
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 25,
    etapeNom: params.get('etape') || params.get('etapeNom') || undefined,
  };
}
