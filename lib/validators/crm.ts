import { z } from 'zod';
import { COMMANDE_STATUTS } from '@/lib/data/commande-status';
import { roundMga } from '@/lib/pricing/mga-round';
import { cuidSchema } from './common';

/** Montant Ariary : positif, plafonné, arrondi entier MGA. */
const mgaAmountSchema = z
  .number()
  .positive('Montant doit être positif')
  .max(999_999_999)
  .transform((v) => roundMga(v))
  .refine((v) => Number.isInteger(v) && v > 0, 'Montant Ariary invalide');

export const createClientSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(200),
  tel: z.string().trim().max(30).optional().nullable(),
  whatsapp: z.string().trim().max(30).optional().nullable(),
  email: z.string().trim().email('Email invalide').max(255).optional().nullable().or(z.literal('')).transform((v) => (v === '' ? null : v)),
  type: z.string().trim().max(50).optional(),
  adresse: z.string().trim().max(500).optional().nullable(),
  ville: z.string().trim().max(100).optional().nullable(),
  canalVente: z.string().trim().max(80).optional().nullable(),
  canalDecouverte: z.string().trim().max(80).optional().nullable(),
  canalCommande: z.string().trim().max(80).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  charte: z.string().trim().max(32000).optional().nullable(),
  nif: z.string().trim().min(1, 'NIF requis').regex(/^\d+$/, 'NIF : chiffres uniquement'),
  statNumber: z.string().trim().max(50).optional().nullable(),
  commercialName: z.string().trim().max(120).optional().nullable(),
  categorie: z.enum(['Prospect', 'Client', 'VIP']).optional(),
  relanceAt: z.union([z.string(), z.date()]).optional().nullable(),
  forceDuplicate: z.boolean().optional(),
});

export const updateClientSchema = createClientSchema.partial().extend({
  statut: z.enum(['Actif', 'Premium', 'VIP', 'Inactif', 'Archivé', 'Prospect']).optional(),
  charte: z.string().trim().max(32000).optional().nullable(),
});

/** Création rapide depuis le flux POS — champs essentiels uniquement */
export const quickCreateClientSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(200),
  tel: z.string().trim().max(30).optional().nullable(),
  email: z.string().trim().email('Email invalide').max(255).optional().nullable().or(z.literal('')).transform((v) => (v === '' ? null : v)),
  nif: z
    .string()
    .trim()
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((v) => (v === '' ? null : v))
    .refine((v) => v == null || /^\d+$/.test(v), 'NIF : chiffres uniquement'),
  adresse: z.string().trim().max(500).optional().nullable(),
  axeLivraison: z.string().trim().max(80).optional().nullable(),
});

export const devisLigneSchema = z.object({
  articleId: z.string().max(100),
  articleLabel: z.string().min(1).max(300),
  category: z.string().max(100).optional(),
  configSnapshot: z.record(z.unknown()).optional(),
  quantity: z.number().int().min(1).max(1_000_000).default(1),
  unite: z.string().max(20).optional(),
  prixUnitaireAuto: z.number().min(0).default(0),
  prixUnitaireForce: z.number().min(0).nullable().optional(),
  totalForce: z.number().min(0).nullable().optional(),
  pricingMode: z.enum(['auto', 'force']).optional(),
  priceReason: z.string().max(500).nullable().optional(),
  remarks: z.string().max(500).nullable().optional(),
});

export const createDevisSchema = z.object({
  clientId: cuidSchema.optional().nullable(),
  lignes: z.array(devisLigneSchema).min(1, 'Au moins une ligne requise').max(100),
  remise: z.number().min(0).max(100).default(0),
  notes: z.string().max(2000).optional().nullable(),
  validUntil: z.union([z.string(), z.date()]).optional(),
});

export const factureLigneSchema = z.object({
  description: z.string().min(1).max(300),
  qty: z.number().min(0).default(1),
  pu: z.number().min(0).default(0),
  total: z.number().min(0),
});

export const createFactureSchema = z.object({
  commandeId: cuidSchema.optional().nullable(),
  clientId: cuidSchema.optional().nullable(),
  lignes: z.array(factureLigneSchema).optional(),
  remise: z.number().min(0).max(100).default(0),
  /** Défaut = taux fiscal indicatif (20 %) — runtime utilise aussi getFiscalConfig. */
  tva: z.number().min(0).max(100).default(20),
  notes: z.string().max(2000).optional().nullable(),
  dateEcheance: z.union([z.string(), z.date()]).optional().nullable(),
});

export const updateFactureSchema = z.object({
  statut: z.enum(['Brouillon', 'Émise', 'Payée', 'Partiellement payée', 'Annulée']).optional(),
  notes: z.string().max(2000).optional().nullable(),
  dateEcheance: z.union([z.string(), z.date()]).optional().nullable(),
  lignes: z.array(factureLigneSchema).optional(),
  remise: z.number().min(0).max(100).optional(),
  tva: z.number().min(0).max(100).optional(),
});

export const createPaiementSchema = z.object({
  factureId: cuidSchema.optional().nullable(),
  commandeId: cuidSchema.optional().nullable(),
  devisId: cuidSchema.optional().nullable(),
  clientId: cuidSchema.optional().nullable(),
  montant: mgaAmountSchema,
  mode: z.enum([
    'Espèces', 'Especes', 'Virement', 'Mobile Money', 'Mvola', 'Orange Money', 'Airtel Money',
    'Chèque', 'Cheque', 'Carte',
  ]).default('Espèces'),
  mobileMoneyProvider: z.enum(['Mvola', 'Orange Money', 'Airtel Money']).optional().nullable(),
  bankName: z.string().max(100).optional().nullable(),
  paymentTime: z.string().max(50).optional().nullable(),
  payerName: z.string().max(100).optional().nullable(),
  reference: z.string().max(100).optional().nullable(),
  type: z.enum(['Acompte', 'Solde', 'Remboursement']).default('Acompte'),
  datePaiement: z.union([z.string(), z.date()]).optional(),
  notes: z.string().max(500).optional().nullable(),
  /** Format document émis au paiement — ticket simplifié ou facture complète. */
  printFormat: z.enum(['ticket', 'facture']).optional().default('facture'),
}).refine((d) => d.factureId || d.commandeId || d.devisId, {
  message: 'factureId, commandeId ou devisId requis',
});

/** Paiement multiple POS / caisse */
export const batchPaiementSchema = z.object({
  factureId: cuidSchema.optional().nullable(),
  commandeId: cuidSchema.optional().nullable(),
  clientId: cuidSchema.optional().nullable(),
  sessionId: z.string().max(64).optional().nullable(),
  source: z.enum(['pos', 'facture', 'commande']).default('pos'),
  totalAttendu: z.number().min(0).optional().transform((v) => (v === undefined ? v : roundMga(v))),
  montantRecuEspeces: z.number().min(0).optional().transform((v) => (v === undefined ? v : roundMga(v))),
  lines: z.array(z.object({
    montant: mgaAmountSchema,
    mode: z.string().min(1).max(50),
    reference: z.string().max(100).optional().nullable(),
  })).min(1).max(6),
  notes: z.string().max(1000).optional().nullable(),
}).refine((d) => d.factureId || d.commandeId || d.source === 'pos', {
  message: 'Lien facture/commande requis hors vente POS directe',
});

export const updateCommandeSchema = z.object({
  statut: z.enum(COMMANDE_STATUTS).optional(),
  avancement: z.number().min(0).max(100).optional(),
  priorite: z.enum(['Basse', 'Normal', 'Haute', 'Urgente']).optional(),
  operateur: z.string().max(100).optional().nullable(),
  machine: z.string().max(100).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
  acompte: z.number().min(0).optional(),
  dateLiv: z.union([z.string(), z.date()]).optional().nullable(),
  force: z.boolean().optional(),
});

export const LOCKED_FACTURE_STATUTS = ['Payée', 'Annulée'] as const;
