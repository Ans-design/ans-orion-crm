import { z } from 'zod';
import { updateCommandeSchema } from '@/lib/validators/crm';

export const updateCommandeInputSchema = updateCommandeSchema;

export type UpdateCommandeInput = z.infer<typeof updateCommandeInputSchema>;
