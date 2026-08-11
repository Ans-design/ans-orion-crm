/**
 * Permissions KPI — sérialisation générique selon sensibilité.
 */

import type { KpiDefinition } from '@/lib/kpi/registry';
import type { KpiEnvelope } from '@/lib/kpi/envelope';
import { kpiForbidden } from '@/lib/kpi/envelope';
import type { KpiQueryContext } from '@/lib/kpi/context';

export function canReadKpi(def: KpiDefinition, ctx: KpiQueryContext): boolean {
  if (def.sensitivity === 'PUBLIC_INTERNAL') return true;
  if (!def.requiredPermission) return true;
  if (ctx.role === 'admin' || ctx.role === 'manager' || ctx.role === 'demo') {
    if (def.sensitivity === 'HR_SENSITIVE' && !ctx.permissions.includes(def.requiredPermission)) {
      return ctx.permissions.includes('rh:payroll') || ctx.permissions.includes('rh:admin');
    }
    return true;
  }
  return ctx.permissions.includes(def.requiredPermission);
}

export function serializeKpiForClient(
  def: KpiDefinition,
  envelope: KpiEnvelope,
  ctx: KpiQueryContext,
): KpiEnvelope | null {
  if (!canReadKpi(def, ctx)) {
    // Omettre plutôt que révéler l’existence pour HR/FINANCIAL strict
    if (def.sensitivity === 'HR_SENSITIVE' || def.sensitivity === 'FINANCIAL') {
      return null;
    }
    return kpiForbidden({
      id: def.id,
      definitionVersion: def.version,
      unit: def.unit,
      period: {
        from: ctx.period.fromIso,
        to: ctx.period.toIso,
        timezone: ctx.period.timezone,
        label: ctx.period.label,
      },
      scope: {
        tenantId: ctx.tenantId,
        siteIds: ctx.siteIds,
        annexIds: ctx.annexIds,
        mode: 'session',
      },
      freshnessSlaSeconds: def.freshnessSlaSeconds,
    });
  }
  return envelope;
}
