'use client';

import { useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useWindowedRows } from '@/lib/hooks/use-windowed-rows';

type Props<T> = {
  items: T[];
  rowKey: (item: T, index: number) => string;
  rowHeight?: number;
  threshold?: number;
  maxHeightClassName?: string;
  className?: string;
  renderRow: (item: T, index: number) => ReactNode;
};

/** Liste scrollable avec fenêtre virtualisée (≥ threshold lignes). */
export function VirtualizedList<T>({
  items,
  rowKey,
  rowHeight = 88,
  threshold = 50,
  maxHeightClassName = 'max-h-[70vh]',
  className,
  renderRow,
}: Props<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { windowRows, startIndex, topSpacerPx, bottomSpacerPx, virtualized } = useWindowedRows(
    items,
    scrollRef,
    rowHeight,
    threshold,
  );

  return (
    <div
      ref={scrollRef}
      className={cn('overflow-auto', maxHeightClassName, className)}
    >
      {virtualized && topSpacerPx > 0 && <div aria-hidden style={{ height: topSpacerPx }} />}
      <div className={virtualized ? 'space-y-2' : 'space-y-2'}>
        {windowRows.map((item, i) => (
          <div key={rowKey(item, startIndex + i)}>{renderRow(item, startIndex + i)}</div>
        ))}
      </div>
      {virtualized && bottomSpacerPx > 0 && <div aria-hidden style={{ height: bottomSpacerPx }} />}
    </div>
  );
}
