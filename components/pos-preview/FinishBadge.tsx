'use client';

import type { FinishVisualStyle } from '@/lib/pos-preview/preview-types';

type Props = { finish: FinishVisualStyle };

export function FinishBadge({ finish }: Props) {
  if (finish.id === 'none') return null;
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-medium bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/25 text-[var(--brand-primary)]">
      {finish.label}
    </span>
  );
}
