/**
 * Navigation smartphone — 4 slots fixes + Apps (lanceur).
 * Toujours fonctionnels : Accueil · Espace · action (POS…) · Talk
 * (indépendamment des trous temporaire du moduleAccess).
 */

import { flattenNavItems, type ModuleAccessMap, type BuiltNavItem } from '@/lib/modules';
import { getHomeRouteForRole } from '@/lib/modules/role-registry';
import { canAccessPage } from '@/lib/page-access';

export type MobileNavEntry = {
  id: 'home' | 'work' | 'action' | 'talk';
  label: string;
  title?: string;
  href: string;
};

const ACTION_CANDIDATES = ['pos', 'devis', 'commandes', 'stock', 'livraisons', 'paiements'] as const;

const ACTION_TAB_LABEL: Record<(typeof ACTION_CANDIDATES)[number], string> = {
  pos: 'POS',
  devis: 'Devis',
  commandes: 'Cmd',
  stock: 'Stock',
  livraisons: 'Livr.',
  paiements: 'Paie',
};

function tabLabel(raw: string, max = 8): string {
  const t = raw.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function pickById(items: BuiltNavItem[], id: string): BuiltNavItem | undefined {
  return items.find((i) => i.id === id);
}

export function buildMobileBottomNav(
  role: string,
  moduleAccess?: ModuleAccessMap,
): { slots: MobileNavEntry[]; more: BuiltNavItem[] } {
  const items = flattenNavItems(role, moduleAccess);
  const homeRoute = getHomeRouteForRole(role);
  const usedHrefs = new Set<string>();
  const slots: MobileNavEntry[] = [];

  /* 1 — Accueil (home rôle, toujours) */
  const homeItem =
    items.find((i) => i.href === homeRoute) ||
    pickById(items, 'cockpit') ||
    items[0];
  const homeHref = homeItem?.href || homeRoute || '/dashboard';
  slots.push({
    id: 'home',
    label: 'Accueil',
    title: homeItem?.label || 'Accueil',
    href: homeHref,
  });
  usedHrefs.add(homeHref);

  /* 2 — Espace (workspace dédié, sinon CRM utile) */
  const work =
    items.find((i) => i.href.startsWith('/workspace/') && !usedHrefs.has(i.href)) ||
    items.find(
      (i) =>
        (i.id === 'devis' || i.id === 'commandes' || i.id === 'clients') &&
        !usedHrefs.has(i.href),
    ) ||
    items.find((i) => !usedHrefs.has(i.href) && !i.href.startsWith('/messagerie'));

  if (work) {
    const isWs = work.href.startsWith('/workspace/');
    slots.push({
      id: 'work',
      label: isWs ? 'Espace' : tabLabel(work.label, 7),
      title: work.label,
      href: work.href,
    });
    usedHrefs.add(work.href);
  } else {
    /* Filet de sécu : mon espace accueil générique */
    const fallback =
      canAccessPage(role, '/workspace/accueil') ? '/workspace/accueil' : homeHref;
    if (!usedHrefs.has(fallback)) {
      slots.push({
        id: 'work',
        label: 'Espace',
        title: 'Mon espace',
        href: fallback,
      });
      usedHrefs.add(fallback);
    }
  }

  /* 3 — Action centrale (POS prioritaire) */
  let action: MobileNavEntry | null = null;
  for (const cand of ACTION_CANDIDATES) {
    const hit = items.find(
      (i) => !usedHrefs.has(i.href) && (i.id === cand || i.href === `/${cand}` || i.href.startsWith(`/${cand}/`)),
    );
    if (hit && canAccessPage(role, hit.href)) {
      action = {
        id: 'action',
        label: ACTION_TAB_LABEL[cand],
        title: hit.label,
        href: hit.href,
      };
      break;
    }
  }
  if (!action && canAccessPage(role, '/pos')) {
    action = { id: 'action', label: 'POS', title: 'Point de vente', href: '/pos' };
  }
  if (!action) {
    const any = items.find((i) => !usedHrefs.has(i.href) && canAccessPage(role, i.href));
    if (any) {
      action = {
        id: 'action',
        label: tabLabel(any.label, 6),
        title: any.label,
        href: any.href,
      };
    }
  }
  if (action) {
    slots.push(action);
    usedHrefs.add(action.href);
  }

  /* 4 — Talk permanent */
  const talkFromNav =
    pickById(items, 'equipe_messages') ||
    items.find((i) => i.href === '/messagerie' || i.href.startsWith('/messagerie/'));
  const talkHref = talkFromNav?.href || '/messagerie';
  if (!usedHrefs.has(talkHref)) {
    slots.push({
      id: 'talk',
      label: 'Talk',
      title: 'ANS Talk',
      href: talkHref,
    });
    usedHrefs.add(talkHref);
  }

  const more = items.filter((i) => !usedHrefs.has(i.href));

  return { slots: slots.slice(0, 4), more };
}

/**
 * Tab bar smartphone permanente sur tout le shell app.
 * Masquée seulement hors app (auth / public / preview).
 */
export function shouldHideMobileBottomNav(pathname: string): boolean {
  if (!pathname) return true;
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) return true;
  if (pathname.startsWith('/bat/') && pathname.includes('public')) return true;
  if (pathname.startsWith('/dev-preview')) return true;
  return false;
}
