import { z } from 'zod';
import {
  MADAGASCAR_CARRIERS,
  type MadagascarCarrier,
} from '@/lib/logistics/madagascar-carriers';

export const CARRIERS_CONFIG_KEY = 'logistics_carriers';

export type { MadagascarCarrier };

export const madagascarCarrierSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
  type: z.enum(['cooperative', 'coursier', 'transporteur', 'interne']),
  zones: z.array(z.string().min(1).max(80)).min(1),
  contactHint: z.string().max(200).optional(),
  active: z.boolean().optional(),
});

export const carriersConfigSchema = z.array(madagascarCarrierSchema).min(1);

export const DEFAULT_CARRIERS: MadagascarCarrier[] = MADAGASCAR_CARRIERS;

export function normalizeCarriersConfig(raw: unknown): MadagascarCarrier[] {
  const parsed = carriersConfigSchema.safeParse(raw);
  if (!parsed.success) return DEFAULT_CARRIERS;
  return parsed.data
    .filter((c) => c.active !== false)
    .map(({ active: _active, ...carrier }) => carrier);
}

export function parseCarriersConfig(raw: unknown) {
  return carriersConfigSchema.safeParse(raw);
}
