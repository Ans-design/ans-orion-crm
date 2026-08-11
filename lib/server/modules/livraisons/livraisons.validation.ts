import { z } from 'zod';
import { cuidSchema } from '@/lib/validators/common';

export const createLivraisonInputSchema = z.object({
  commandeId: cuidSchema,
  clientId: cuidSchema.optional().nullable(),
  adresseLiv: z.string().max(500).optional().nullable(),
  contactLiv: z.string().max(120).optional().nullable(),
  telLiv: z.string().max(30).optional().nullable(),
  livreur: z.string().max(100).optional().nullable(),
  datePrevue: z.union([z.string(), z.date()]).optional().nullable(),
  colisCount: z.number().int().min(1).max(999).optional(),
  poidsKg: z.number().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateLivraisonInputSchema = z.object({
  statut: z.enum(['Préparation', 'Prêt', 'En livraison', 'Livré', 'Retour']).optional(),
  adresseLiv: z.string().max(500).optional().nullable(),
  contactLiv: z.string().max(120).optional().nullable(),
  telLiv: z.string().max(30).optional().nullable(),
  livreur: z.string().max(100).optional().nullable(),
  datePrevue: z.union([z.string(), z.date()]).optional().nullable(),
  colisCount: z.number().int().min(1).max(999).optional(),
  poidsKg: z.number().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  proofPhotoUrl: z.string().max(2000).optional().nullable(),
  proofNote: z.string().max(2000).optional().nullable(),
  signatureData: z.string().max(500_000).optional().nullable(),
});

export type CreateLivraisonInput = z.infer<typeof createLivraisonInputSchema>;
export type UpdateLivraisonInput = z.infer<typeof updateLivraisonInputSchema>;

export type LivraisonListQuery = {
  search: string;
  statut: string;
  commandeId: string;
  livreur: string;
  trash?: boolean;
};
