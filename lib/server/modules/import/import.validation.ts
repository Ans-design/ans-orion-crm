import { z } from 'zod';

export const IMPORT_TYPES = ['clients', 'tarifs', 'devis', 'commandes', 'factures', 'paiements'] as const;

export const importPreviewInputSchema = z.object({
  type: z.enum(IMPORT_TYPES),
  data: z.array(z.record(z.unknown())),
  mode: z.enum(['merge', 'replace']).default('merge'),
});

export type ImportPreviewInput = z.infer<typeof importPreviewInputSchema>;

export type ImportRowError = { row: number; message: string };

export type ImportPreviewResult = {
  type: string;
  mode: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ImportRowError[];
  preview: Record<string, unknown>[];
};
