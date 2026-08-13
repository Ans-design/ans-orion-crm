export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth-utils';
import { ok, created } from '@/lib/server/http/api-response';
import { parseOr400 } from '@/lib/validators/parse';
import {
  FLUX_STEP_MODULES,
  type ProductionFluxRule,
  type ProductionFluxStep,
  type ProductionFluxTransition,
} from '@/lib/data/production-flux-config';
import {
  getProductionFluxPayload,
  upsertProductionFluxStep,
  deleteProductionFluxStep,
  updateProductionFluxRule,
  updateProductionFluxTransition,
} from '@/lib/services/production-flux-service';
import { invalidateSyncDiagnosticsCache } from '@/lib/services/sync.service';
import { attachLiveDomains } from '@/lib/live/live-response';

const FLUX_LIVE_DOMAINS = ['production', 'sync', 'commandes'] as const;

export async function GET() {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  const payload = await getProductionFluxPayload();
  return ok(payload);
}

const stepSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  responsibleRole: z.string().min(1),
  linkedModules: z.array(z.enum(FLUX_STEP_MODULES)).default([]),
  targetDelayHours: z.number().min(0),
  active: z.boolean(),
  required: z.boolean(),
  visiblePlanning: z.boolean(),
  generatesTask: z.boolean(),
  requiresValidation: z.boolean(),
  blocksNext: z.boolean(),
  commandeStatut: z.string().nullable().optional(),
  taskType: z.string().nullable().optional(),
  planningResource: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0),
});

const transitionSchema = z.object({
  id: z.string().min(1),
  fromStepId: z.string().min(1),
  toStepId: z.string().min(1),
  condition: z.string().default(''),
  authorizedRole: z.string().min(1),
  mode: z.enum(['auto', 'manual']),
  generatesTask: z.boolean(),
  updatesPlanning: z.boolean(),
  active: z.boolean(),
  label: z.string().default(''),
});

const ruleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  condition: z.string().min(1),
  action: z.string().min(1),
  impactedModule: z.string().min(1),
  level: z.enum(['info', 'warning', 'blocking']),
  active: z.boolean(),
});

const bodySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('step'),
    data: stepSchema,
    linkFromStepId: z.string().nullable().optional(),
    transitionMode: z.enum(['auto', 'manual']).optional(),
  }),
  z.object({
    type: z.literal('delete-step'),
    stepId: z.string().min(1),
  }),
  z.object({ type: z.literal('transition'), data: transitionSchema }),
  z.object({ type: z.literal('rule'), data: ruleSchema }),
]);

export async function POST(req: NextRequest) {
  const auth = await requirePermission('settings:write');
  if ('error' in auth) return auth.error;

  const parsed = parseOr400(bodySchema, await req.json());
  if ('error' in parsed) return parsed.error;

  const { type } = parsed.data;

  if (type === 'step') {
    const stepBody = parsed.data;
    const config = await upsertProductionFluxStep(stepBody.data as ProductionFluxStep, {
      userId: auth.userId,
      userName: auth.userName,
      linkFromStepId: stepBody.linkFromStepId,
      transitionMode: stepBody.transitionMode,
    });
    invalidateSyncDiagnosticsCache();
    return attachLiveDomains(created({ config }), FLUX_LIVE_DOMAINS);
  }

  if (type === 'delete-step') {
    try {
      const config = await deleteProductionFluxStep(parsed.data.stepId, {
        userId: auth.userId,
        userName: auth.userName,
      });
      invalidateSyncDiagnosticsCache();
      return attachLiveDomains(ok({ config }), FLUX_LIVE_DOMAINS);
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: { message: e instanceof Error ? e.message : 'Suppression impossible' } },
        { status: 400 },
      );
    }
  }

  if (type === 'transition') {
    const config = await updateProductionFluxTransition(parsed.data.data as ProductionFluxTransition, {
      userId: auth.userId,
    });
    invalidateSyncDiagnosticsCache();
    return attachLiveDomains(created({ config }), FLUX_LIVE_DOMAINS);
  }

  const config = await updateProductionFluxRule(parsed.data.data as ProductionFluxRule, {
    userId: auth.userId,
  });
  invalidateSyncDiagnosticsCache();
  return attachLiveDomains(created({ config }), FLUX_LIVE_DOMAINS);
}
