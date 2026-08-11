import { z } from 'zod';
import { COMMANDE_BLOCAGE_RAISONS } from '@/lib/constants/commande-blocage';

const blocageRaisonEnum = z.enum(
  COMMANDE_BLOCAGE_RAISONS as unknown as [string, ...string[]],
);

export const createCommandeBlocageSchema = z.object({
  raison: blocageRaisonEnum,
  causeDetail: z.string().max(500).optional().nullable(),
  responsable: z.string().max(120).optional().nullable(),
  actionAttendue: z.string().max(300).optional().nullable(),
});

export const resolveCommandeBlocageSchema = z.object({
  action: z.literal('resolve'),
  blocageId: z.string().min(1),
  resolveNote: z.string().max(500).optional().nullable(),
});

export const commandeBlocagePostSchema = z.union([
  resolveCommandeBlocageSchema,
  createCommandeBlocageSchema,
]);
