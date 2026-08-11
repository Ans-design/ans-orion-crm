'use client';

import type { ChangeEvent, ReactNode, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Option = {
  value: string;
  label: string;
  disabled?: boolean;
};

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
  options?: Option[];
  children?: ReactNode;
  className?: string;
};

/** Select filtre unifié (même hauteur / bordure que SearchInput). */
export function FilterSelect({
  value,
  onChange,
  options,
  children,
  className,
  ...rest
}: Props) {
  const handle = (e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value);

  return (
    <select
      {...rest}
      value={value}
      onChange={handle}
      className={cn('orion-filter-select', className)}
    >
      {options
        ? options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))
        : children}
    </select>
  );
}
