import { z } from 'zod';
import { emailSchema } from './common';

export const ACCESS_REQUEST_ROLES = [
  'commercial',
  'production',
  'designer',
  'livraison',
  'caisse',
  'lecture',
] as const;

export const ACCESS_REQUEST_PROBLEM_TYPES = [
  'connexion',
  'mot_de_passe',
  'compte_bloque',
  'acces_refuse',
  'demande_acces',
  'autre',
] as const;

export const ACCESS_REQUEST_PROBLEM_LABELS: Record<string, string> = {
  connexion: 'Problème de connexion',
  mot_de_passe: 'Mot de passe oublié',
  compte_bloque: 'Compte bloqué',
  acces_refuse: 'Accès refusé',
  demande_acces: 'Demande d\'accès / nouveau compte',
  autre: 'Autre',
};

export const accessRequestSchema = z.object({
  nom: z.string().trim().min(2, 'Nom requis').max(120),
  email: emailSchema,
  telephone: z.string().trim().max(30).optional().or(z.literal('')),
  matricule: z.string().trim().max(20).optional().or(z.literal('')),
  problemType: z.enum(ACCESS_REQUEST_PROBLEM_TYPES).optional().or(z.literal('')),
  roleDemande: z.string().trim().max(40).optional().or(z.literal('')),
  service: z.string().trim().max(80).optional().or(z.literal('')),
  message: z.string().trim().max(2000).optional().or(z.literal('')),
  attachmentName: z.string().trim().max(200).optional().or(z.literal('')),
  attachmentContent: z.string().max(2_000_000).optional().or(z.literal('')),
});

export const accessRequestReviewSchema = z.object({
  statut: z.enum(['accepte', 'refuse', 'traitee']),
  reviewNote: z.string().trim().max(500).optional(),
  createUser: z.boolean().optional(),
  role: z.enum(['commercial', 'caisse', 'production', 'livraison', 'designer', 'lecture', 'demo']).optional(),
});
