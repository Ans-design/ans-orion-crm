'use client';

/**
 * Sidebar Administration simplifiée (micro-nav optionnelle).
 * La navigation ERP globale reste dans AppShell — ce composant ne remplace pas les routes protégées.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Boxes,
  GitPullRequest,
  LayoutDashboard,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/administration/vue-ensemble', label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: '/administration/catalogue-prix-stock', label: 'Catalogue, Prix & Stock', icon: Boxes },
  { href: '/administration/production-flux', label: 'Production & Flux', icon: GitPullRequest },
  { href: '/administration/roles-permissions', label: 'Organisation', icon: Users },
] as const;

type Props = {
  className?: string;
  /** Si true, affiche une colonne latérale (pages démo). Défaut : masqué (AppShell gère). */
  visible?: boolean;
};

export function AdminSidebar({ className, visible = false }: Props) {
  const pathname = usePathname();
  if (!visible) return null;

  return (
    <aside
      className={cn(
        'flex w-[260px] shrink-0 flex-col border-r border-[var(--cps-border)] bg-[var(--cps-bg)]',
        className,
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-[var(--cps-border)] px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-[var(--cps-brand)] text-sm font-bold text-white">
          AO
        </div>
        <div>
          <p className="m-0 text-sm font-bold text-[var(--cps-title)]">ANS ORION</p>
          <p className="m-0 font-mono text-[10px] text-[var(--cps-muted)]">Administration</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--cps-muted)]">
          Général
        </p>
        {LINKS.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 rounded-[7px] px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-[var(--cps-brand-soft)] font-semibold text-[var(--cps-brand)] ring-1 ring-[color-mix(in_srgb,var(--cps-brand)_45%,transparent)]'
                  : 'text-[var(--cps-muted)] hover:bg-[var(--cps-surface-2)] hover:text-[var(--cps-title)]',
              )}
            >
              <Icon className={cn('h-4 w-4', active ? 'text-[var(--cps-brand)]' : 'text-[var(--cps-muted)]')} />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
