/** Palette graphiques Cockpit — hex explicites pour Recharts SVG (pas hsl(var(--chart-N))).
 *  Brand ANS : rouge / or / rose / ardoise — pas de vert (hors identité Design Print).
 */

export const CHART_COLORS = {
  primary: '#FF174D',
  primaryLight: '#FF3366',
  primaryHover: '#C91443',
  gridDark: 'rgba(148, 163, 184, 0.16)',
  gridLight: '#E2E8F0',
  textDark: '#CBD5E1',
  textLight: '#475569',
} as const;

/** Série multi-couleurs — donuts, barres catégorielles (contraste dark/light). */
export const CHART_SERIES: readonly string[] = [
  '#FF174D', // rouge ANS
  '#FACC15', // or
  '#64748B', // ardoise (ex-vert — identité ANS)
  '#C91443', // rouge profond ANS
  '#F59E0B', // ambre
  '#FB7185', // rose soft
  '#94A3B8', // gris moyen
  '#334155', // gris foncé
];

export const CHART_CA = '#FF174D';
export const CHART_DEPENSES = '#FACC15';
/** Positif / bénéfice — ardoise ANS (pas de vert). */
export const CHART_BENEFICE = '#64748B';
export const CHART_PROJECTED = '#FB7185';

/** Axe Y montants Ar — évite les « 0k » quand valeur < 1000. */
export function formatChartAxisAmount(v: number): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
}

export const MACHINE_STATUS_COLORS: Record<string, string> = {
  hors_service: '#EF4444',
  maintenance: '#F59E0B',
  disponible: '#64748B',
  en_production: '#FF174D',
  en_attente: '#FACC15',
};

export const MACHINE_STATUS_LABELS: Record<string, string> = {
  hors_service: 'Hors service',
  maintenance: 'Maintenance',
  disponible: 'Disponible',
  en_production: 'En production',
  en_attente: 'En attente',
};

/** Map Prisma Machine.status → clé sémantique */
export const PRISMA_MACHINE_STATUS_MAP: Record<string, string> = {
  down: 'hors_service',
  maintenance: 'maintenance',
  ok: 'disponible',
  running: 'en_production',
  waiting: 'en_attente',
};
