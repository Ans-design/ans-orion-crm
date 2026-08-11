import { z } from 'zod';

export const supplierSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(200),
  tel: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  adresse: z.string().max(500).optional().nullable(),
  ville: z.string().max(100).optional().nullable(),
  contact: z.string().max(100).optional().nullable(),
  categorie: z.string().max(50).default('Papier'),
  notes: z.string().max(5000).optional().nullable(),
  statut: z.enum(['Actif', 'Inactif']).optional(),
  paymentTerms: z.string().max(200).optional().nullable(),
});

export const purchaseOrderLineSchema = z.object({
  stockItemId: z.string().optional().nullable(),
  label: z.string().min(1).max(300),
  qty: z.number().min(0.01),
  purchaseUnit: z.string().max(30).optional().nullable(),
  conversionFactor: z.number().min(0).optional().nullable(),
  unitCost: z.number().min(0).default(0),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1),
  lignes: z.array(purchaseOrderLineSchema).min(1),
  notes: z.string().max(5000).optional().nullable(),
  expectedAt: z.string().datetime().optional().nullable(),
});

export const planningSlotSchema = z.object({
  title: z.string().min(1).max(200),
  productionId: z.string().optional().nullable(),
  commandeId: z.string().optional().nullable(),
  machine: z.string().max(100).optional().nullable(),
  operateur: z.string().max(100).optional().nullable(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  statut: z.enum(['Planifié', 'En cours', 'Terminé', 'Annulé']).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const materialEntrySchema = z.object({
  id: z.string().min(1).max(50),
  label: z.string().min(1).max(100),
  category: z.enum(['print', 'carte', 'autre']),
  actif: z.boolean(),
  grammages: z.array(z.string().max(20)).min(1),
});

export const materialsConfigSchema = z.array(materialEntrySchema);
