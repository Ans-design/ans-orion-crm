import { z } from 'zod';

export const createMaterielSchema = z.object({
  code: z.string().min(2).max(30),
  name: z.string().min(2).max(120),
  category: z.string().min(2).max(40),
  type: z.string().optional().nullable(),
  marque: z.string().optional().nullable(),
  modele: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  etat: z.string().optional(),
  localisation: z.string().optional().nullable(),
  site: z.string().optional(),
  poste: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  prixAchat: z.number().optional().nullable(),
  fournisseur: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateMaterielSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  category: z.string().optional(),
  etat: z.string().optional(),
  localisation: z.string().optional().nullable(),
  site: z.string().optional(),
  poste: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  prochaineMaint: z.string().optional().nullable(),
});

export type CreateMaterielInput = z.infer<typeof createMaterielSchema>;
export type UpdateMaterielInput = z.infer<typeof updateMaterielSchema>;
