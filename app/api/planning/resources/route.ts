export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { getProductionFluxConfig } from '@/lib/services/production-flux-service';
import {
  DEFAULT_PRODUCTION_FLUX_STEPS,
  type ProductionFluxStep,
} from '@/lib/data/production-flux-config';

/** Étapes Gantt = toutes les étapes actives Production & Flux (admin). */
function pickPlanningEtapes(steps: ProductionFluxStep[]): Array<{
  id: string;
  name: string;
  code: string;
  responsibleRole: string;
  targetDelayHours: number;
}> {
  return [...steps]
    .filter((s) => s.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      responsibleRole: s.responsibleRole,
      targetDelayHours: s.targetDelayHours,
    }));
}

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
    const fallbackNames = pickPlanningEtapes(DEFAULT_PRODUCTION_FLUX_STEPS).map((e) => e.name);

    return NextResponse.json({
      etapes: etapes.length > 0 ? etapes : fallbackNames.map((name, i) => ({
        id: `fallback-${i}`,
        name,
        code: name,
        responsibleRole: 'production',
        targetDelayHours: 4,
      })),
      operators: users
        .filter((u) => Boolean(u.name?.trim()))
        .map((u) => ({ id: u.id, name: u.name as string, role: u.role })),
      source: 'production-flux',
    });
  }, {
    fallbackResponse: {
      etapes: pickPlanningEtapes(DEFAULT_PRODUCTION_FLUX_STEPS),
      operators: [],
      source: 'defaults',
    },
  });
}
