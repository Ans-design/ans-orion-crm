'use client';

import { useRouter } from 'next/navigation';
import {
  UserPlus, FileText, ShoppingCart, CalendarClock, Cpu, ShoppingBag,
  Truck, AlertTriangle, Star, Download,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';

type ActionKey =
  | 'client' | 'quote' | 'pos' | 'production' | 'machine'
  | 'purchase' | 'delivery' | 'incident' | 'employee' | 'export';

type Action = {
  key: ActionKey;
  label: string;
  /** Libellé court phone (évite ellipse trop agressive) */
  shortLabel?: string;
  desc: string;
  shortDesc?: string;
  href: string;
  icon: LucideIcon;
  toast?: string;
};

const QUICK_ACTION_STYLES: Record<ActionKey, string> = {
  client: 'bg-slate-100 text-slate-700 group-hover:bg-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:group-hover:bg-slate-700/60',
  quote: 'bg-violet-50 text-violet-600 group-hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-400 dark:group-hover:bg-violet-950/60',
  pos: 'bg-rose-50 text-rose-600 group-hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:group-hover:bg-rose-950/60',
  production: 'bg-orange-50 text-orange-600 group-hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-400 dark:group-hover:bg-orange-950/60',
  machine: 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-slate-700',
  purchase: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:group-hover:bg-emerald-950/60',
  delivery: 'bg-rose-50 text-rose-600 group-hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:group-hover:bg-rose-950/60',
  incident: 'bg-red-50 text-red-600 group-hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:group-hover:bg-red-950/60',
  employee: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:group-hover:bg-amber-950/60',
  export: 'bg-rose-50 text-[var(--primary)] group-hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:group-hover:bg-rose-950/60',
};

const ACTIONS: Action[] = [
  { key: 'client', label: 'Ajouter client', shortLabel: 'Client', desc: 'CRM & facturation', shortDesc: 'CRM', href: '/clients?action=new', icon: UserPlus, toast: 'Ouverture formulaire client' },
  { key: 'quote', label: 'Créer devis', shortLabel: 'Devis', desc: 'Devis & proformas', shortDesc: 'Proformas', href: '/devis', icon: FileText, toast: 'Module devis' },
  { key: 'pos', label: 'Ouvrir POS', shortLabel: 'POS', desc: 'Catalogue configurateur', shortDesc: 'Catalogue', href: '/pos', icon: ShoppingCart, toast: 'POS catalogue' },
  { key: 'production', label: 'Planifier production', shortLabel: 'Production', desc: 'Gantt & planning', shortDesc: 'Planning', href: '/planning', icon: CalendarClock },
  { key: 'machine', label: 'Contrôle machines', shortLabel: 'Machines', desc: 'État parc machines', shortDesc: 'Parc', href: '/machines', icon: Cpu },
  { key: 'purchase', label: 'Ajouter achat', shortLabel: 'Achats', desc: 'Commande fournisseur', shortDesc: 'Fournisseur', href: '/achats', icon: ShoppingBag },
  { key: 'delivery', label: 'Créer livraison', shortLabel: 'Livraison', desc: 'Dispatch & tournées', shortDesc: 'Tournées', href: '/livraisons', icon: Truck },
  { key: 'incident', label: 'Signaler incident', shortLabel: 'Incident', desc: 'Ticket maintenance', shortDesc: 'Maintenance', href: '/maintenance/tickets', icon: AlertTriangle },
  { key: 'employee', label: 'Noter collaborateur', shortLabel: 'Équipe', desc: 'Performance équipe', shortDesc: 'RH', href: '/rh/performance', icon: Star },
  { key: 'export', label: 'Export rapport', shortLabel: 'Rapports', desc: 'Analytics & KPI', shortDesc: 'Analytics', href: '/rapports', icon: Download },
];

export function CockpitActions() {
  const router = useRouter();

  return (
    <section className="orion-card p-4 sm:p-5 min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4 min-w-0">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 min-w-0 truncate">
          <span className="w-2 h-2 rounded-full bg-[var(--brand-primary)] shrink-0" />
          <span className="truncate">Actions rapides</span>
        </h3>
        <span className="text-[11px] text-[var(--text-muted)] font-medium shrink-0 tabular-nums">
          {ACTIONS.length}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 min-w-0">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          const title = a.label;
          const sub = a.desc;
          return (
            <button
              key={a.href}
              type="button"
              title={`${a.label} — ${a.desc}`}
              onClick={() => {
                router.push(a.href);
                if (a.toast) uxToast.success(a.toast, { icon: '⚡' });
              }}
              className="cockpit-quick-card group flex min-w-0 w-full max-w-full overflow-hidden items-center gap-2 sm:gap-3 text-left p-2.5 sm:p-4 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
            >
              <div className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-[7px] transition-colors shrink-0 ${QUICK_ACTION_STYLES[a.key]}`}>
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <h4 className="text-[12px] sm:text-sm font-semibold text-[var(--text-primary)] leading-tight truncate">
                  <span className="sm:hidden">{a.shortLabel ?? a.label}</span>
                  <span className="hidden sm:inline">{title}</span>
                </h4>
                <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] mt-0.5 leading-snug truncate">
                  <span className="sm:hidden">{a.shortDesc ?? a.desc}</span>
                  <span className="hidden sm:inline">{sub}</span>
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
