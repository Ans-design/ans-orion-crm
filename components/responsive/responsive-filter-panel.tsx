'use client';

import { useState, type ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useResponsiveMode } from '@/lib/responsive/use-responsive-mode';
import { AdaptiveOverlay } from '@/components/responsive/adaptive-overlay';
import { cn } from '@/lib/utils';

type Props = {
  /** Filtres essentiels toujours visibles (PC / tablette) */
  essentials: ReactNode;
  /** Filtres avancés */
  advanced?: ReactNode;
  activeCount?: number;
  className?: string;
  title?: string;
};

/**
 * Filtres : barre PC ; bouton + bottom sheet phone.
 */
export function ResponsiveFilterPanel({
  essentials,
  advanced,
  activeCount = 0,
  className,
  title = 'Filtres',
}: Props) {
  const { mode } = useResponsiveMode();
  const [open, setOpen] = useState(false);

  if (mode === 'phone') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-[7px] border border-border bg-card text-sm font-medium"
          aria-expanded={open}
        >
          <SlidersHorizontal size={16} aria-hidden />
          {title}
          {activeCount > 0 ? (
            <span className="tabular-nums text-primary font-semibold">({activeCount})</span>
          ) : null}
        </button>
        <AdaptiveOverlay
          open={open}
          onOpenChange={setOpen}
          task="choice"
          title={title}
          forcePresentation="sheet-bottom"
        >
          <div className="space-y-4 pb-[env(safe-area-inset-bottom)]">
            {essentials}
            {advanced}
          </div>
        </AdaptiveOverlay>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap items-end gap-2 min-w-0', className)}>
      {essentials}
      {advanced}
    </div>
  );
}
