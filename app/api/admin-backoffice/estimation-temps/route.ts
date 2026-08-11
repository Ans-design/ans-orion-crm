export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth-utils';
import { ok } from '@/lib/server/http/api-response';
import { parseOr400 } from '@/lib/validators/parse';
import {
  deleteEstimationRate,
  getEstimationTempsConfig,
  getEstimationTempsConfigFilled,
  getEstimationTempsPayload,
  resetEstimationTempsToDefaults,
  saveEstimationTempsConfig,
  upsertEstimationRate,
} from '@/lib/services/estimation-temps-service';
import {
  normalizeCapacity,
  normalizeRate,
  type TimeRateMode,
  type ResourceType,
} from '@/lib/data/estimation-temps-config';

export async function GET() {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  const payload = await getEstimationTempsPayload();
  return ok(payload);
}

const rateSchema = z.object({
  id: z.string().min(1).optional(),
  articleId: z.string().min(1),
  articleLabel: z.string().default(''),
  family: z.string().default('Général'),
  taskKey: z.string().min(1),
  taskLabel: z.string().default(''),
  mode: z.enum(['pcs_per_hour', 'fixed_min', 'm2_per_hour']),
  rateValue: z.number().min(0),
  setupMin: z.number().min(0).default(0),
  resourceType: z.enum(['machine', 'person', 'either', 'controle']).default('either'),
  resourceHint: z.string().default(''),
  people: z.number().min(1).default(1),
  color: z.string().default('#6758e8'),
  qtyRef: z.number().min(1).default(1),
  notes: z.string().default(''),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).optional(),
});

const capacitySchema = z.object({
  openHour: z.string().default('08:00'),
  closeHour: z.string().default('17:00'),
  pauseMin: z.number().min(0).default(60),
  safetyMarginPct: z.number().min(0).max(100).default(15),
});

const bodySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('upsert'), data: rateSchema }),
  z.object({ type: z.literal('delete'), id: z.string().min(1) }),
  z.object({ type: z.literal('reset') }),
  z.object({ type: z.literal('capacity'), capacity: capacitySchema }),
  z.object({
    type: z.literal('replace'),
    rates: z.array(rateSchema),
    capacity: capacitySchema.optional(),
  }),
]);

export async function POST(req: NextRequest) {
  const auth = await requirePermission('settings:write');
  if ('error' in auth) return auth.error;

  const parsed = parseOr400(bodySchema, await req.json().catch(() => null));
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;

  if (body.type === 'upsert') {
    const rate = normalizeRate({
      ...body.data,
      id: body.data.id,
      mode: body.data.mode as TimeRateMode,
      resourceType: body.data.resourceType as ResourceType,
    });
    const saved = await upsertEstimationRate(rate);
    const config = await getEstimationTempsConfigFilled(saved);
    return ok({ config });
  }

  if (body.type === 'delete') {
    const saved = await deleteEstimationRate(body.id);
    const config = await getEstimationTempsConfigFilled(saved);
    return ok({ config });
  }

  if (body.type === 'reset') {
    const saved = await resetEstimationTempsToDefaults();
    const config = await getEstimationTempsConfigFilled(saved);
    return ok({ config });
  }

  if (body.type === 'capacity') {
    const { config } = await getEstimationTempsConfig();
    const next = await saveEstimationTempsConfig({
      ...config,
      capacity: normalizeCapacity(body.capacity),
    });
    const filled = await getEstimationTempsConfigFilled(next);
    return ok({ config: filled });
  }

  const { config: current } = await getEstimationTempsConfig();
  const rates = body.rates.map((r, i) =>
    normalizeRate({
      ...r,
      mode: r.mode as TimeRateMode,
      resourceType: r.resourceType as ResourceType,
    }, (i + 1) * 10),
  );
  const saved = await saveEstimationTempsConfig({
    version: 1,
    updatedAt: new Date().toISOString(),
    rates,
    capacity: normalizeCapacity(body.capacity ?? current.capacity),
  });
  const config = await getEstimationTempsConfigFilled(saved);
  return ok({ config });
}
