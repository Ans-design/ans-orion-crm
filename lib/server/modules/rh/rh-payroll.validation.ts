import { z } from 'zod';

export const updatePayrollInputSchema = z.object({
  employeeId: z.string().min(1),
  salaireBaseMGA: z.number().optional(),
  notesFraisMGA: z.number().optional(),
  heuresSup: z.number().int().optional(),
  primeMGA: z.number().optional(),
  cantineHeure: z.string().optional(),
});

export type UpdatePayrollInput = z.infer<typeof updatePayrollInputSchema>;
