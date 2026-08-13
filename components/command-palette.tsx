'use client';

import { useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, FileText, Banknote, Search, X,
} from 'lucide-react';
import { getHomeRouteForRole } from '@/lib/modules';
import { getDashboardForAuthRole } from '@/lib/cockpit/dashboard-registry';
import { buildSidebarUniverses } from '@/lib/navigation/build-sidebar-universes';
import { getModuleSearchTerms } from '@/lib/navigation/sidebar-universes';

const QUICK_ACTIONS = [
  { id: 'new-client', label: 'Nouveau client', href: '/clients', icon: Users, group: 'Actions rapides' },
  { id: 'new-devis', label: 'Nouveau devis', href: '/panier', icon: FileText, group: 'Actions rapides' },
  { id: 'new-payment', label: 'Enregistrer un paiement', href: '/paiements', icon: Banknote, group: 'Actions rapides' },
];

type SearchHit = { type: string; id: string; label: string; sub?: string; href: string };

type PaletteAction = {
  id: string;
  label: string;
  href: string;
  group: string;
  sub?: string;
  icon: typeof Search;
};

function highlightMatch(text: string, query: string): ReactNode {
  const q = query.trim();
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="orion-cmd__mark">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/** Palette de commandes — Ctrl+K, filtrée par rôle */
export function CommandPalette({ role = 'user' }: { role?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);

  const roleActions = useMemo((): PaletteAction[] => {
    const dash = getDashboardForAuthRole(role);
    const home = getHomeRouteForRole(role);
    const universes = buildSidebarUniverses(role);
    const seen = new Set<string>();
    const items: PaletteAction[] = [];

    items.push({
      id: 'home',
      label: dash.label,
      href: home,
      icon: LayoutDashboard,
      group: 'Accueil',
    });
    seen.add(home);

    for (const universe of universes) {
      for (const n of universe.items) {
        if (seen.has(n.href)) continue;
        seen.add(n.href);
        items.push({
          id: n.id,
          label: n.label,
          href: n.href,
          icon: n.icon as typeof Search,
          group: universe.label,
          sub: universe.flowLabel,
        });
      }
    }

    for (const q of QUICK_ACTIONS) {
      if (!seen.has(q.href)) items.push(q);
    }

    return items;
  }, [role]);

  useEffect(() => {
    if (!open || query.trim().length < 2) { setSearchHits([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d) => setSearchHits(d.results || []))
        .catch(() => setSearchHits([]));
    }, 200);
    return () => clearTimeout(t);
  }, [query, open]);

  const filtered = useMemo((): PaletteAction[] => {
    const q = query.trim().toLowerCase();
    const hits: PaletteAction[] = searchHits.map((h) => ({
      id: `${h.type}-${h.id}`,
      label: h.label,
      href: h.href,
      group: `Recherche · ${h.type}`,
      sub: h.sub,
      icon: Search,
    }));
    const menuFiltered = q
      ? roleActions.filter((a) => {
          const terms = getModuleSearchTerms(a.id, a.label);
          return terms.some((t) => t.toLowerCase().includes(q))
            || a.group.toLowerCase().includes(q)
            || (a.sub?.toLowerCase().includes(q) ?? false);
        })
      : roleActions;
    if (hits.length > 0) {
      const hitHrefs = new Set(hits.map((h) => h.href));
      return [...hits, ...menuFiltered.filter((m) => !hitHrefs.has(m.href))];
    }
    return menuFiltered;
  }, [query, searchHits, roleActions]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery('');
      router.push(href);
    },
    [router],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery('');
        setActiveIdx(0);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
    };
    const onOpen = () => {
      if (typeof window !== 'undefined') {
        (window as Window & { __orionCmdPalettePending?: boolean }).__orionCmdPalettePending = false;
      }
      setOpen(true);
      setQuery('');
      setActiveIdx(0);
    };
    const onClose = () => setOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('openCommandPalette', onOpen);
    window.addEventListener('closeCommandPalette', onClose);
    if ((window as Window & { __orionCmdPalettePending?: boolean }).__orionCmdPalettePending) {
      onOpen();
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('openCommandPalette', onOpen);
      window.removeEventListener('closeCommandPalette', onClose);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && filtered[activeIdx]) {
        e.preventDefault();
        go(filtered[activeIdx].href);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, activeIdx, go]);

  useEffect(() => setActiveIdx(0), [query]);

  useEffect(() => {
    if (!open) return;
    document
      .querySelector<HTMLElement>(`[data-cmd-idx="${activeIdx}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open, filtered.length]);

  if (!open) return null;

  const groups = [...new Set(filtered.map((a) => a.group))];

  return (
    <div
      className="orion-cmd"
      role="dialog"
      aria-modal="true"
      aria-label="Palette de commandes"
      data-command-palette
    >
      <div className="orion-cmd__backdrop" onClick={() => setOpen(false)} aria-hidden />
      <div className="orion-cmd__panel">
        <div className="orion-cmd__search">
          <span className="orion-cmd__search-icon" aria-hidden>
            <Search size={15} strokeWidth={2.2} />
          </span>
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Module, client, devis, commande…"
            className="orion-cmd__input"
            aria-label="Recherche palette"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="orion-cmd__kbd orion-cmd__kbd--esc">Esc</kbd>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="orion-cmd__close"
            aria-label="Fermer"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        <div className="orion-cmd__list" role="listbox" aria-label="Résultats">
          {filtered.length === 0 && (
            <div className="orion-cmd__empty">
              <span className="orion-cmd__empty-icon" aria-hidden>
                <Search size={18} strokeWidth={1.8} />
              </span>
              <p className="orion-cmd__empty-title">Aucun résultat</p>
              <p className="orion-cmd__empty-hint">Essayez un module, un client ou un n° de devis</p>
            </div>
          )}
          {groups.map((group) => (
            <div key={group} className="orion-cmd__group">
              <p className="orion-cmd__group-label">{group}</p>
              {filtered
                .filter((a) => a.group === group)
                .map((action) => {
                  const idx = filtered.indexOf(action);
                  const Icon = action.icon;
                  const active = idx === activeIdx;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      data-cmd-idx={idx}
                      onClick={() => go(action.href)}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={`orion-cmd__item${active ? ' is-active' : ''}`}
                    >
                      <span className="orion-cmd__item-icon" aria-hidden>
                        <Icon size={15} strokeWidth={1.9} />
                      </span>
                      <span className="orion-cmd__item-body">
                        <span className="orion-cmd__item-label">
                          {highlightMatch(action.label, query)}
                        </span>
                        {action.sub && (
                          <span className="orion-cmd__item-sub">{action.sub}</span>
                        )}
                      </span>
                      {active && <kbd className="orion-cmd__kbd orion-cmd__enter">↵</kbd>}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>

        <div className="orion-cmd__footer">
          <span className="orion-cmd__hint"><kbd className="orion-cmd__kbd">↑↓</kbd> naviguer</span>
          <span className="orion-cmd__hint"><kbd className="orion-cmd__kbd">↵</kbd> ouvrir</span>
          <span className="orion-cmd__hint"><kbd className="orion-cmd__kbd">⌘K</kbd> fermer</span>
          <span className="orion-cmd__count">
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
