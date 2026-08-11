export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { loadMaterialCatalog } from '@/lib/services/material-catalog-service';
import { buildWeightsByType, printMaterialLabels } from '@/lib/pos/material-weights';
import { runApiHandler } from '@/lib/api-guard';

/** Catalogue matières/grammages pour POS — lecture seule */
export async function GET() {
  const auth = await requirePermission('pos:use');
  if ('error' in auth) {
    const cfg = await requirePermission('config:view');
    if ('error' in cfg) return auth.error;
  }

  return runApiHandler('materials-catalog GET', async () => {
    const materials = await loadMaterialCatalog();
    return NextResponse.json({
      materials,
      weightsByType: buildWeightsByType(materials),
      printLabels: printMaterialLabels(materials),
      source: materials.length > 0 ? 'database' : 'fallback',
    });
  }, {
    fallback: {
      materials: [],
      weightsByType: {},
      printLabels: {},
      source: 'fallback',
    },
  });
}
