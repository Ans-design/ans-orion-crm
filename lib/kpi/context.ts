/**
 * Contexte KPI — scope uniquement depuis session serveur.
 */

import type { BusinessPeriod } from '@/lib/kpi/business-clock';
import { DEFAULT_BUSINESS_TIMEZONE, resolveBusinessPeriod } from '@/lib/kpi/business-clock';

export type KpiQueryContext = {
  tenantId: string;
  siteIds: string[];
  annexIds: string[];
  userId: string;
  role: string;
  permissions: string[];
  timezone: string;
  locale: string;
  currency: string;
  period: BusinessPeriod;
  filters: Record<string, unknown>;
  requestedAsOf?: string;
};

export type SessionKpiInput = {
  userId: string;
  role: string;
  permissions?: string[];
  siteIds?: string[];
  annexIds?: string[];
  tenantId?: string;
  /** Filtres demandés par le client — toujours intersectés. */
  requestedSiteIds?: string[];
  requestedRole?: string;
  periodPreset?: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  dateFrom?: string;
  dateTo?: string;
};

function intersect(allowed: string[], requested?: string[]): string[] {
  if (!requested?.length) return allowed;
  const set = new Set(allowed);
  return requested.filter((id) => set.has(id));
}

/**
 * Construit le contexte. Un `requestedRole` client ne remplace JAMAIS `role` session.
 */
export function buildKpiQueryContext(input: SessionKpiInput): KpiQueryContext {
  void input.requestedRole; // explicitement ignoré (KPI102)
  const siteIds = intersect(input.siteIds ?? [], input.requestedSiteIds);
  const period = resolveBusinessPeriod({
    preset: input.periodPreset === 'custom' || input.dateFrom ? 'custom' : input.periodPreset ?? 'week',
    fromIso: input.dateFrom,
    toIso: input.dateTo,
    timeZone: DEFAULT_BUSINESS_TIMEZONE,
  });

  return {
    tenantId: input.tenantId ?? 'default',
    siteIds,
    annexIds: input.annexIds ?? [],
    userId: input.userId,
    role: input.role,
    permissions: input.permissions ?? [],
    timezone: DEFAULT_BUSINESS_TIMEZONE,
    locale: 'fr-MG',
    currency: 'MGA',
    period,
    filters: {},
  };
}
