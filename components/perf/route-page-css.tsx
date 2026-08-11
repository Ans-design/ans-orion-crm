'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ROUTE_PAGE_CSS } from '@/lib/perf/route-page-css';

const loaded = new Set<number>();

/** Injecte le/les CSS métier de la route courante (une fois par feuille). */
export function RoutePageCss() {
  const pathname = usePathname() || '';

  useEffect(() => {
    ROUTE_PAGE_CSS.forEach((entry, idx) => {
      if (!entry.match(pathname)) return;
      if (loaded.has(idx)) return;
      loaded.add(idx);
      void entry.load().catch(() => {
        loaded.delete(idx);
      });
    });
  }, [pathname]);

  return null;
}
