'use client';

import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type OrionAlertVariant = 'info' | 'warning' | 'error' | 'success';

const VARIANTS: Record<
  OrionAlertVariant,
  { icon: typeof Info; className: string }
> = {
  info: {
    icon: Info,
    className:
      'border-[color-mix(in_srgb,var(--primary)_25%,transparent)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] text-[var(--text-main)] [&_svg]:text-[var(--primary)]',
  },
  warning: {
    icon: AlertTriangle,
    className:
      'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100 [&_svg]:text-amber-600 dark:[&_svg]:text-amber-400',
  },
  error: {
    icon: AlertCircle,
    className:
      'border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200 [&_svg]:text-red-600 dark:[&_svg]:text-red-400',
  },
  success: {
    icon: CheckCircle2,
    className:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 [&_svg]:text-emerald-600 dark:[&_svg]:text-emerald-400',
  },
};

export function OrionAlert({
  variant = 'info',
  title,
  children,
  className,
  role = 'status',
}: {
  variant?: OrionAlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
  role?: 'status' | 'alert';
}) {
  const { icon: Icon, className: variantClass } = VARIANTS[variant];
  return (
    <div
      role={role}
      className={cn(
        'flex items-start gap-2.5 rounded-[7px] border px-3.5 py-3 text-sm leading-relaxed',
        variantClass,
        className,
      )}
    >
      <Icon size={18} className="shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0">
        {title ? <p className="font-semibold mb-0.5">{title}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}
