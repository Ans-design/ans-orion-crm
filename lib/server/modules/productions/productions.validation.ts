import { z } from 'zod';
import type { PaginationParams } from '@/lib/api-pagination';

export const productionEtapeSchema = z.object({
  nom: z.string().min(1).max(100),
  ordre: z.number().int().min(1).optional(),
});

export const createProductionSchema = z.object({
  commandeId: z.string().min(1),
  priorite: z.string().max(30).optional(),
  operateur: z.string().max(100).optional().nullable(),
  machine: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  etapes: z.array(productionEtapeSchema).optional(),
  force: z.boolean().optional(),
});

export const updateProductionSchema = z.object({
  statut: z.string().max(50).optional(),
  priorite: z.string().max(30).optional(),
  operateur: z.string().max(100).optional().nullable(),
  machine: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  avancement: z.number().int().min(0).max(100).optional(),
  dateDebut: z.union([z.string(), z.date()]).optional().nullable(),
  dateFin: z.union([z.string(), z.date()]).optional().nullable(),
  proofPhotoUrl: z.string().max(2000).optional().nullable(),
  proofNote: z.string().max(2000).optional().nullable(),
  proofBy: z.string().max(100).optional().nullable(),
  force: z.boolean().optional(),
});

export const updateProductionEtapeSchema = z.object({
  etapeId: z.string().min(1),
  statut: z.string().max(50).optional(),
  operateur: z.string().max(100).optional().nullable(),
  machine: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type UpdateProductionEtapeInput = z.infer<typeof updateProductionEtapeSchema>;

export type CreateProductionInput = z.infer<typeof createProductionSchema>;
export type UpdateProductionInput = z.infer<typeof updateProductionSchema>;

export type ProductionListQuery = {
  search: string;
  statut: string;
  commandeId: string;
  paginate: boolean;
  pagination: PaginationParams;
};

export const DEFAULT_PRODUCTION_ETAPES = [
  { nom: 'PAO', ordre: 1 },
  { nom: 'Impression', ordre: 2 },
  { nom: 'Finition', ordre: 3 },
  { nom: 'Découpe', ordre: 4 },
  { nom: 'Contrôle qualité', ordre: 5 },
  { nom: 'Emballage', ordre: 6 },
];
