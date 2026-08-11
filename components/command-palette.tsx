'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, FileText, ClipboardList, Receipt, Banknote,
  Printer, Palette, ShoppingCart, Search, X, Wallet, Shield, Factory,
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
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
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

  if (!open) return null;

  const groups = [...new Set(filtered.map((a) => a.group))];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Palette de commandes"
      data-command-palette
    >
      <div className="absolute inset-0 bg-backdrop backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-[7px] shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Module, client, devis, commande… (ex: pos, facture, stock)"
            className="flex-1 bg-transparent text-sm outline-none"
            aria-label="Recherche palette"
          />
          <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground">Esc</kbd>
          <button type="button" onClick={() => setOpen(false)} className="p-1 rounded hover:bg-accent min-h-[44px] min-w-[44px] inline-flex items-center justify-center" aria-label="Fermer">
            <X size={14} />
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Aucun résultat</p>
          )}
          {groups.map((group) => (
            <div key={group} className="mb-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1">{group}</p>
              {filtered
                .filter((a) => a.group === group)
                .map((action) => {
                  const idx = filtered.indexOf(action);
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => go(action.href)}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                        idx === activeIdx ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
                      }`}
                    >
                      <Icon size={16} className="shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block truncate">{action.label}</span>
                        {action.sub && <span className="block text-[10px] text-muted-foreground truncate">{action.sub}</span>}
                      </span>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-border text-[10px] text-muted-foreground flex gap-3">
          <span>↑↓ naviguer</span>
          <span>↵ ouvrir</span>
          <span>Ctrl+K fermer/ouvrir</span>
        </div>
      </div>
    </div>
  );
}
