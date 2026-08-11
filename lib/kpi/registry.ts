/**
 * Registre KPI exécutable V13.
 */

import type { KpiUnit } from '@/lib/kpi/envelope';
import { EXECUTIVE_KPIS } from '@/lib/kpi/definitions/executive';
import { COMMERCIAL_KPIS } from '@/lib/kpi/definitions/commercial';
import {
  PRODUCTION_KPIS,
  STUDIO_KPIS,
  MACHINE_KPIS,
  STOCK_KPIS,
  LOGISTICS_KPIS,
  FINANCE_KPIS,
  RH_KPIS,
  COMMUNICATION_KPIS,
  ADMIN_KPIS,
} from '@/lib/kpi/definitions/production';

export type KpiDefinitionStatus = 'ACTIVE' | 'BLOCKED' | 'DEPRECATED';

export type KpiDefinition = {
  id: string;
  version: number;
  label: string;
  description: string;
  ownerDomain: string;
  ownerRole: string;
  unit: KpiUnit;
  grain: 'EVENT' | 'DAY' | 'WEEK' | 'MONTH' | 'CURRENT_STATE';
  canonicalDateField: string;
  sourceOfTruth: string[];
  formula: string;
  numerator?: string;
  denominator?: string;
  eligibleStatuses?: string[];
  excludedStatuses?: string[];
  sensitivity: 'PUBLIC_INTERNAL' | 'OPERATIONAL' | 'FINANCIAL' | 'HR_SENSITIVE';
  requiredPermission: string;
  defaultPeriod: string;
  freshnessSlaSeconds: number;
  comparisonPolicy: string;
  drilldownRoute?: string;
  status: KpiDefinitionStatus;
  blockedReason?: string;
};

const ALL: KpiDefinition[] = [
  ...EXECUTIVE_KPIS,
  ...COMMERCIAL_KPIS,
  ...STUDIO_KPIS,
  ...PRODUCTION_KPIS,
  ...MACHINE_KPIS,
  ...STOCK_KPIS,
  ...LOGISTICS_KPIS,
  ...FINANCE_KPIS,
  ...RH_KPIS,
  ...COMMUNICATION_KPIS,
  ...ADMIN_KPIS,
];

const BY_ID = new Map(ALL.map((d) => [d.id, d]));

export function getKpiDefinition(id: string): KpiDefinition | undefined {
  return BY_ID.get(id);
}

export function listKpiDefinitions(filter?: { domain?: string; status?: KpiDefinitionStatus }) {
  return ALL.filter((d) => {
    if (filter?.domain && d.ownerDomain !== filter.domain) return false;
    if (filter?.status && d.status !== filter.status) return false;
    return true;
  });
}

export function assertKpiRegistryIntegrity(): { ok: boolean; duplicateIds: string[] } {
  const seen = new Set<string>();
  const duplicateIds: string[] = [];
  for (const d of ALL) {
    if (seen.has(d.id)) duplicateIds.push(d.id);
    seen.add(d.id);
  }
  return { ok: duplicateIds.length === 0, duplicateIds };
}
