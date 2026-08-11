'use client';

import type { ReactNode } from 'react';
import { useResponsiveMode } from '@/lib/responsive/use-responsive-mode';
import { cn } from '@/lib/utils';

type Props = {
  list: ReactNode;
  detail: ReactNode | null;
  /** Sur phone/tablet portrait : detail null → liste seule ; détail = route */
  className?: string;
  listClassName?: string;
  detailClassName?: string;
  /** Largeur min liste pour split (px) */
  minListWidth?: number;
};

/**
 * Master/detail : split desktop + tablette paysage ; stack phone (detail via navigation).
 */
export function ResponsiveMasterDetail({
  list,
  detail,
  className,
  listClassName,
  detailClassName,
  minListWidth = 320,
}: Props) {
  const { mode, orientation, width } = useResponsiveMode();
  const canSplit =
    mode === 'desktop' ||
    (mode === 'tablet' && orientation === 'landscape' && width >= minListWidth + 360);

  if (!canSplit || !detail) {
    return <div className={cn('min-w-0', className, listClassName)}>{list}</div>;
  }

  return (
    <div className={cn('grid grid-cols-1 xl:grid-cols-[minmax(280px,1fr)_minmax(360px,1.2fr)] gap-4 min-w-0', className)}>
      <div className={cn('min-w-0 min-h-0 overflow-auto', listClassName)}>{list}</div>
      <div className={cn('min-w-0 min-h-0 overflow-auto', detailClassName)}>{detail}</div>
    </div>
  );
}
