import type { ResponsiveMode } from '@/lib/responsive/breakpoints';

export type LayoutTemplate =
  | 'list'
  | 'dashboard'
  | 'detail'
  | 'form'
  | 'master-detail'
  | 'board'
  | 'wizard'
  | 'messaging';

export type LayoutRouteConfig = {
  routePrefix: string;
  template: LayoutTemplate;
  /** Stratégie table → cartes sur phone */
  tableStrategy: 'cards-phone' | 'scroll-matrix' | 'none';
  filterStrategy: 'bar' | 'drawer-tablet' | 'sheet-phone';
  detailStrategy: 'drawer' | 'route' | 'split';
  stickyActions: boolean;
  notes?: string;
};

/** Registre déclaratif (docs/tests) — ne duplique pas permissions. */
export const LAYOUT_REGISTRY: LayoutRouteConfig[] = [
  {
    routePrefix: '/commandes',
    template: 'list',
    tableStrategy: 'cards-phone',
    filterStrategy: 'sheet-phone',
    detailStrategy: 'route',
    stickyActions: true,
  },
  {
    routePrefix: '/devis',
    template: 'list',
    tableStrategy: 'cards-phone',
    filterStrategy: 'sheet-phone',
    detailStrategy: 'route',
    stickyActions: true,
  },
  {
    routePrefix: '/clients',
    template: 'list',
    tableStrategy: 'cards-phone',
    filterStrategy: 'sheet-phone',
    detailStrategy: 'route',
    stickyActions: true,
  },
  {
    routePrefix: '/dashboard',
    template: 'dashboard',
    tableStrategy: 'none',
    filterStrategy: 'bar',
    detailStrategy: 'drawer',
    stickyActions: false,
  },
  {
    routePrefix: '/pos',
    template: 'wizard',
    tableStrategy: 'none',
    filterStrategy: 'bar',
    detailStrategy: 'drawer',
    stickyActions: true,
    notes: 'Bottom nav permanente — PosMobileSummary empilée au-dessus (stack)',
  },
  {
    routePrefix: '/messagerie',
    template: 'messaging',
    tableStrategy: 'none',
    filterStrategy: 'bar',
    detailStrategy: 'route',
    stickyActions: false,
  },
  {
    routePrefix: '/livraisons',
    template: 'list',
    tableStrategy: 'cards-phone',
    filterStrategy: 'sheet-phone',
    detailStrategy: 'route',
    stickyActions: true,
  },
  {
    routePrefix: '/stock',
    template: 'list',
    tableStrategy: 'cards-phone',
    filterStrategy: 'sheet-phone',
    detailStrategy: 'route',
    stickyActions: true,
  },
  {
    routePrefix: '/production',
    template: 'board',
    tableStrategy: 'cards-phone',
    filterStrategy: 'sheet-phone',
    detailStrategy: 'route',
    stickyActions: true,
  },
  {
    routePrefix: '/paiements',
    template: 'list',
    tableStrategy: 'cards-phone',
    filterStrategy: 'sheet-phone',
    detailStrategy: 'route',
    stickyActions: true,
  },
  {
    routePrefix: '/bat',
    template: 'detail',
    tableStrategy: 'none',
    filterStrategy: 'bar',
    detailStrategy: 'route',
    stickyActions: true,
  },
];

export function layoutForPath(pathname: string): LayoutRouteConfig | undefined {
  const hits = LAYOUT_REGISTRY.filter(
    (r) => pathname === r.routePrefix || pathname.startsWith(`${r.routePrefix}/`),
  );
  return hits.sort((a, b) => b.routePrefix.length - a.routePrefix.length)[0];
}

export function prefersCardList(pathname: string, mode: ResponsiveMode): boolean {
  const cfg = layoutForPath(pathname);
  return Boolean(cfg?.tableStrategy === 'cards-phone' && mode === 'phone');
}
