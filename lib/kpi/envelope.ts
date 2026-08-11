/**
 * Envelope KPI V13 — value nullable + status séparé.
 */

export type KpiUnit =
  | 'MGA'
  | 'COUNT'
  | 'PERCENT'
  | 'HOURS'
  | 'MINUTES'
  | 'SHEETS'
  | 'M2'
  | 'KG'
  | 'ITEMS'
  | 'DAYS'
  | 'SCORE'
  | 'RATE_FH';

export type KpiStatus =
  | 'FRESH'
  | 'STALE'
  | 'PARTIAL'
  | 'NO_DATA'
  | 'NOT_APPLICABLE'
  | 'FORBIDDEN'
  | 'ERROR'
  | 'PENDING_SYNC';

export type KpiEnvelope<T extends number | null = number | null> = {
  id: string;
  definitionVersion: number;
  value: T;
  unit: KpiUnit;
  status: KpiStatus;
  period: { from: string; to: string; timezone: string; label: string };
  scope: { tenantId: string; siteIds: string[]; annexIds: string[]; mode: string };
  numerator?: number;
  denominator?: number;
  sampleSize?: number;
  previousValue?: number | null;
  deltaAbsolute?: number | null;
  deltaPercent?: number | null;
  coverage?: number;
  computedAt: string;
  dataAsOf: string;
  sourceWatermark: string;
  freshnessSlaSeconds: number;
  drilldown?: { route: string; filters: Record<string, string> };
  warnings?: string[];
  errorId?: string;
};

export function kpiFresh(
  partial: Omit<KpiEnvelope<number>, 'status' | 'computedAt' | 'dataAsOf' | 'sourceWatermark'> & {
    dataAsOf?: string;
    sourceWatermark?: string;
  },
): KpiEnvelope<number> {
  const now = new Date().toISOString();
  return {
    ...partial,
    status: 'FRESH',
    computedAt: now,
    dataAsOf: partial.dataAsOf ?? now,
    sourceWatermark: partial.sourceWatermark ?? now,
  };
}

export function kpiNoData(
  base: Pick<KpiEnvelope, 'id' | 'definitionVersion' | 'unit' | 'period' | 'scope' | 'freshnessSlaSeconds'>,
): KpiEnvelope<null> {
  const now = new Date().toISOString();
  return {
    ...base,
    value: null,
    status: 'NO_DATA',
    computedAt: now,
    dataAsOf: now,
    sourceWatermark: now,
  };
}

export function kpiForbidden(
  base: Pick<KpiEnvelope, 'id' | 'definitionVersion' | 'unit' | 'period' | 'scope' | 'freshnessSlaSeconds'>,
): KpiEnvelope<null> {
  const now = new Date().toISOString();
  return {
    ...base,
    value: null,
    status: 'FORBIDDEN',
    computedAt: now,
    dataAsOf: now,
    sourceWatermark: now,
  };
}

export function kpiError(
  base: Pick<KpiEnvelope, 'id' | 'definitionVersion' | 'unit' | 'period' | 'scope' | 'freshnessSlaSeconds'>,
  errorId: string,
): KpiEnvelope<null> {
  const now = new Date().toISOString();
  return {
    ...base,
    value: null,
    status: 'ERROR',
    errorId,
    computedAt: now,
    dataAsOf: now,
    sourceWatermark: now,
  };
}

export function kpiPartial<T extends number | null>(
  envelope: KpiEnvelope<T>,
  warnings: string[],
  coverage?: number,
): KpiEnvelope<T> {
  return {
    ...envelope,
    status: 'PARTIAL',
    warnings,
    coverage,
  };
}

/** Zéro prouvé (source OK) — jamais pour masquer une erreur. */
export function kpiZeroFresh(
  base: Omit<KpiEnvelope<number>, 'status' | 'value' | 'computedAt' | 'dataAsOf' | 'sourceWatermark'>,
): KpiEnvelope<number> {
  return kpiFresh({ ...base, value: 0 });
}
