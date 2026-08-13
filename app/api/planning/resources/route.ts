export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { getProductionFluxConfig } from '@/lib/services/production-flux-service';
import {
  DEFAULT_PRODUCTION_FLUX_STEPS,
  pickPlanningEtapes,
} from '@/lib/data/production-flux-config';

export async function GET() {
  const auth = await requirePermission('planning:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('planning/resources GET', async () => {
    const [config, users] = await Promise.all([
      getProductionFluxConfig().catch(() => null),
      prisma.user
        .findMany({
          select: { id: true, name: true, role: true },
          orderBy: { name: 'asc' },
          take: 120,
        })
        .catch(() => []),
    ]);

    const steps = config?.steps?.length ? config.steps : DEFAULT_PRODUCTION_FLUX_STEPS;
    const etapes = pickPlanningEtapes(steps);
    const fallback = pickPlanningEtapes(DEFAULT_PRODUCTION_FLUX_STEPS);

    return NextResponse.json({
      etapes: etapes.length > 0 ? etapes : fallback,
      operators: users
        .filter((u) => Boolean(u.name?.trim()))
        .map((u) => ({ id: u.id, name: u.name as string, role: u.role })),
      source: config?.steps?.length ? 'production-flux' : 'defaults',
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }, {
    fallbackResponse: {
      etapes: pickPlanningEtapes(DEFAULT_PRODUCTION_FLUX_STEPS),
      operators: [],
      source: 'defaults',
    },
  });
}
