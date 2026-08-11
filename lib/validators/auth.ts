import { z } from 'zod';
import { emailSchema, passwordSchema } from './common';

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().max(120).optional(),
  role: z.enum(['commercial', 'caisse', 'production', 'livraison', 'designer', 'lecture', 'demo']).optional(),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().max(255).optional(),
  email: z.string().trim().max(255).optional(),
}).refine(
  (d) => (d.identifier || d.email || '').trim().length > 0,
  { message: 'Email ou matricule requis' },
);

export const loginFailSchema = z.object({
  email: z.string().trim().max(255).optional().default(''),
});

export const loginCheckSchema = z.object({
  identifier: z.string().trim().max(255).optional(),
  login: z.string().trim().max(255).optional(),
  matricule: z.string().trim().max(255).optional(),
  email: z.string().trim().max(255).optional(),
  password: z.string().max(256).optional(),
  motDePasse: z.string().max(256).optional(),
  mot_de_passe: z.string().max(256).optional(),
}).passthrough();

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Lien invalide ou expiré'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export const loginSuccessSchema = z.object({
  redirect: z.string().trim().max(500).optional(),
}).passthrough();
