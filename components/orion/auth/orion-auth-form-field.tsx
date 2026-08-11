'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Champ formulaire auth — labels/hints alignés sur la carte login. */
export function OrionAuthFormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  labelAction,
  children,
  className,
  shake,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  labelAction?: ReactNode;
  children: ReactNode;
  className?: string;
  shake?: boolean;
}) {
  return (
    <div className={cn('space-y-1.5', shake && 'orion-auth-field-shake', className)}>
      {label ? (
        <div className="flex w-full flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <label
            htmlFor={htmlFor}
            className="text-xs font-semibold text-[var(--login-panel-muted)] shrink-0"
          >
            {label}
            {required ? <span className="sr-only"> (obligatoire)</span> : null}
          </label>
          {labelAction ? <div className="flex shrink-0 sm:justify-end">{labelAction}</div> : null}
        </div>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-[var(--login-panel-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
