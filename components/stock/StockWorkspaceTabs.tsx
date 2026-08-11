'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const TABS = [
  { href: '/stock', label: 'Vue stock', match: (p: string, q: string) => p === '/stock' && !q },
  { href: '/stock?tab=inventaire', label: 'Inventaire', match: (p: string, q: string) => p === '/stock' && q.includes('tab=inventaire') },
  { href: '/stock?tab=mouvements', label: 'Mouvements', match: (p: string, q: string) => p === '/stock' && q.includes('tab=mouvements') },
  { href: '/stock?tab=maintenance', label: 'Maintenance', match: (p: string, q: string) => p === '/stock' && q.includes('tab=maintenance') },
  { href: '/finance/ventes-directes', label: 'Vente directe', match: (p: string) => p.startsWith('/finance/ventes-directes') },
  { href: '/achats', label: 'Achats', match: (p: string) => p === '/achats' },
  { href: '/fournisseurs', label: 'Fournisseurs', match: (p: string) => p === '/fournisseurs' },
] as const;

export function StockWorkspaceTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams?.toString() ?? '';

  return (
    <div className="flex flex-wrap gap-1 border-b border-border pb-2">
      {TABS.map((tab) => {
        const active = tab.match(pathname, query);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3 py-1.5 rounded-[7px] text-xs font-medium transition-colors ${
              active
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'text-muted-foreground hover:bg-accent border border-transparent'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
