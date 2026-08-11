'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useBottomActionStackOptional } from '@/components/responsive/bottom-action-stack';

type Props = {
  children: ReactNode;
  className?: string;
  /** Masquer sur desktop ≥1280 (défaut true) — visible phone + tablette terrain */
  phoneOnly?: boolean;
};

/**
 * Barre d’actions sticky bas — s’enregistre dans BottomActionStack (V15).
 */
export function StickyActionBar({ children, className, phoneOnly = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const stack = useBottomActionStackOptional();
  const setLayerHeight = stack?.setLayerHeight;
  const offsetAbove = stack?.offsetAbove;

  useEffect(() => {
    if (!setLayerHeight) return;
    const el = ref.current;
    const apply = () => setLayerHeight('stickyAction', el?.offsetHeight ?? 0);
    apply();
    const ro = typeof ResizeObserver !== 'undefined' && el ? new ResizeObserver(apply) : null;
    if (el && ro) ro.observe(el);
    return () => {
      ro?.disconnect();
      setLayerHeight('stickyAction', 0);
    };
  }, [setLayerHeight]);

  const bottom = offsetAbove ? offsetAbove('stickyAction') : 0;

  return (
    <div
      ref={ref}
      data-orion-sticky-action
      className={cn(
        'fixed inset-x-0 z-[58] border-t border-border bg-background/95 backdrop-blur-md px-3 pt-2',
        // V15 : phone <768 + tablet 768–1279 ; desktop ≥1280 = xl
        phoneOnly && 'xl:hidden',
        className,
      )}
      style={{
        bottom,
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex flex-wrap items-center gap-2 justify-start [&_button]:min-h-[44px] [&_button]:w-auto [&_button]:flex-none [&_a]:w-auto [&_a]:flex-none">
        {children}
      </div>
    </div>
  );
}
