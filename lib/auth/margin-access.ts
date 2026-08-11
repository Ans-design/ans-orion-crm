import { hasPermission } from '@/lib/auth/permissions';

/** Direction / finance — voit coûts et marges (consignes fusion étape 8) */
export function canViewMargin(role: string): boolean {
  return hasPermission(role, 'pos:view_margin');
}

/** Lecture montants paie / masse salariale — admin (rh:payroll_read). */
export function canViewPayrollAmounts(role: string): boolean {
  return hasPermission(role, 'rh:payroll_read');
}

/**
 * KPIs financiers (CA, progression CA) — direction / finance / rapports.
 * Atelier (production, designer, livraison…) : non.
 */
export function canViewFinancialKPIs(role: string): boolean {
  return (
    hasPermission(role, 'pos:view_margin') ||
    hasPermission(role, 'finance:read') ||
    hasPermission(role, 'rapports:read')
  );
}

/** Scores RH nominatifs (noms employés) — pas seulement rapports:read. */
export function canViewNamedTeamPerformance(role: string): boolean {
  return hasPermission(role, 'rh:read') || role === 'admin';
}

export type MarginSensitiveReport = {
  achatsTotal?: number;
  achatsCount?: number;
  margeEstimee?: number;
  masseSalarialeBrute?: number;
  avancesEnCours?: number;
  avancesCount?: number;
};

/** Retire indicateurs financiers / RH sensibles selon le rôle. */
export function stripMarginFromReport<T extends MarginSensitiveReport>(
  report: T,
  role: string,
): Omit<T, keyof MarginSensitiveReport> & Partial<MarginSensitiveReport> {
  let out: Record<string, unknown> = { ...report };

  if (!canViewMargin(role)) {
    const {
      achatsTotal: _a,
      achatsCount: _c,
      margeEstimee: _m,
      ...rest
    } = out as MarginSensitiveReport & Record<string, unknown>;
    out = rest;
  }

  if (!canViewPayrollAmounts(role)) {
    const {
      masseSalarialeBrute: _ms,
      avancesEnCours: _ae,
      avancesCount: _ac,
      ...rest
    } = out;
    out = rest;
  }

  return out as Omit<T, keyof MarginSensitiveReport> & Partial<MarginSensitiveReport>;
}

export type CoutRevientRow = {
  coutRevient?: number;
  marge?: number;
  margePct?: number;
};

export function stripCoutsRevientRow<T extends CoutRevientRow>(row: T, role: string): T {
  if (canViewMargin(role)) return row;
  const { coutRevient: _c, marge: _m, margePct: _p, ...rest } = row;
  return rest as T;
}

export function stripStockUnitCost<T extends { unitCost?: number | null }>(
  item: T,
  role: string,
): T {
  if (canViewMargin(role)) return item;
  const { unitCost: _u, ...rest } = item;
  return rest as T;
}

const PURCHASE_PRICE_KEYS = [
  'purchasePrice',
  'lastPurchasePrice',
  'materialCost',
  'coutAchat',
  'prixAchat',
  'unitCost',
  'costPrice',
] as const;

/** Retire tous les champs prix d’achat / coût (SEC-03) — tarifs:read ne suffit pas. */
export function stripPurchasePriceFields<T>(row: T, role: string): T {
  if (canViewMargin(role) || row == null || typeof row !== 'object') return row;
  const out = { ...(row as Record<string, unknown>) };
  for (const key of PURCHASE_PRICE_KEYS) {
    if (key in out) delete out[key];
  }
  return out as T;
}

export function stripPurchasePriceFieldsDeep<T>(value: T, role: string): T {
  if (canViewMargin(role)) return value;
  if (Array.isArray(value)) {
    return value.map((item) => stripPurchasePriceFieldsDeep(item, role)) as T;
  }
  if (value && typeof value === 'object') {
    const stripped = stripPurchasePriceFields(value, role) as Record<string, unknown>;
    for (const [k, v] of Object.entries(stripped)) {
      if (v && typeof v === 'object') {
        stripped[k] = stripPurchasePriceFieldsDeep(v, role);
      }
    }
    return stripped as T;
  }
  return value;
}

export type Commande360OverviewPayload = {
  summary?: {
    margeEstimee?: number;
    margeEstimeePct?: number;
  };
};

/** Retire marges estimées du hub commande 360 pour les rôles sans pos:view_margin. */
export function stripCommande360Overview<T extends Commande360OverviewPayload>(
  data: T,
  role: string,
): T {
  if (canViewMargin(role) || !data.summary) return data;
  const { margeEstimee: _m, margeEstimeePct: _p, ...summaryRest } = data.summary;
  return { ...data, summary: summaryRest as T['summary'] };
}

export type PurchaseOrderMarginPayload = {
  totalHT?: number;
  lignes?: Array<{ unitCost?: number; total?: number }>;
};

export function stripPurchaseOrder<T extends PurchaseOrderMarginPayload>(
  order: T,
  role: string,
): T {
  if (canViewMargin(role)) return order;
  const { totalHT: _t, lignes, ...rest } = order;
  return {
    ...rest,
    lignes: lignes?.map((line) => {
      const { unitCost: _u, total: _l, ...lineRest } = line;
      return lineRest as (typeof lignes)[number];
    }),
  } as T;
}

const DASHBOARD_MARGIN_KEYS = [
  'margeGlobale',
  'margeReelle',
  'margeReellePct',
] as const;

/** Retire les KPIs de marge du payload dashboard/cockpit. */
export function stripDashboardMarginFields<T extends Record<string, unknown>>(
  payload: T,
  role: string,
): T {
  if (canViewMargin(role)) return payload;
  const next = { ...payload } as Record<string, unknown>;
  const kpis = next.kpis;
  if (kpis && typeof kpis === 'object' && !Array.isArray(kpis)) {
    const cleaned = { ...(kpis as Record<string, unknown>) };
    for (const key of DASHBOARD_MARGIN_KEYS) {
      delete cleaned[key];
    }
    next.kpis = cleaned;
  }
  return next as T;
}

type OpsFinancialPayload = {
  kpis?: Record<string, unknown>;
  realtime?: Record<string, unknown> | null;
  canViewFinancialKPIs?: boolean;
};

/** Retire CA / progression CA des stats Opérations pour les rôles atelier. */
export function stripOperationsFinancial<T extends OpsFinancialPayload>(
  payload: T,
  role: string,
): T & { canViewFinancialKPIs: boolean } {
  const allowed = canViewFinancialKPIs(role);
  if (allowed) {
    return { ...payload, canViewFinancialKPIs: true };
  }
  const kpis = payload.kpis ? { ...payload.kpis } : undefined;
  if (kpis) {
    delete kpis.caProgressPct;
  }
  const realtime = payload.realtime ? { ...payload.realtime } : payload.realtime;
  if (realtime && typeof realtime === 'object') {
    delete realtime.caMonth;
    delete realtime.caProgressPct;
    if (Array.isArray(realtime.commandesEnCours)) {
      realtime.commandesEnCours = realtime.commandesEnCours.map((row: Record<string, unknown>) => {
        const { total: _t, ...rest } = row;
        return rest;
      });
    }
    if (Array.isArray(realtime.paiementsByMode)) {
      delete realtime.paiementsByMode;
    }
  }
  return {
    ...payload,
    kpis,
    realtime,
    canViewFinancialKPIs: false,
  };
}

type PerformanceLike = {
  employees?: {
    scores?: Array<{ name: string; value: number; color?: string }>;
    topPerformers?: Array<{ name: string; value: number; color?: string }>;
    byDepartment?: Array<{ name: string; value: number; color?: string }>;
    avgScore?: number;
    activeCount?: number;
  };
  canViewNamedTeamPerformance?: boolean;
};

/** Anonymise les scores RH nominatifs si pas rh:read. */
export function stripNamedTeamPerformance<T extends PerformanceLike>(
  payload: T,
  role: string,
): T & { canViewNamedTeamPerformance: boolean } {
  const allowed = canViewNamedTeamPerformance(role);
  if (allowed) {
    return { ...payload, canViewNamedTeamPerformance: true };
  }
  const employees = payload.employees
    ? {
        ...payload.employees,
        scores: [],
        topPerformers: [],
        // Départements agrégés OK si taille > 1 — on conserve byDepartment
      }
    : undefined;
  return {
    ...payload,
    employees,
    canViewNamedTeamPerformance: false,
  };
}

/** Neutralise formules CSV Excel (=, +, -, @) sur cellules texte utilisateur. */
export function sanitizeCsvCell(value: unknown): string {
  const raw = String(value ?? '');
  const escaped = raw.replace(/"/g, '""');
  if (/^[=+\-@]/.test(escaped)) {
    return `'${escaped}`;
  }
  return escaped;
}
