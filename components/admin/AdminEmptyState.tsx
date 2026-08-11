'use client';

import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  /** Icône optionnelle — Inbox par défaut */
  icon?: ReactNode;
};

/** Empty state Admin unifié — clair, actionnable, sans emoji décoratif. */
export function AdminEmptyState({ title, description, actions, className, icon }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-[7px] border border-dashed border-[var(--cps-border,#E2E8F0)] bg-[var(--cps-surface-2,#F8FAFC)] px-6 py-10 text-center',
        className,
      )}
      role="status"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-[7px] bg-[var(--cps-surface,#fff)] text-[var(--cps-muted,#64748B)] shadow-sm">
        {icon ?? <Inbox className="h-5 w-5" strokeWidth={1.5} aria-hidden />}
      </div>
      <h3 className="m-0 text-sm font-semibold text-[var(--cps-title,#0F172A)]">{title}</h3>
      {description ? (
        <p className="m-0 max-w-md text-xs leading-relaxed text-[var(--cps-muted,#64748B)]">{description}</p>
      ) : null}
      {actions ? <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{actions}</div> : null}
    </div>
  );
}
