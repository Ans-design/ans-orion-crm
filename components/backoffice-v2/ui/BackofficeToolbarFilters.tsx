import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function BackofficeToolbarFilters({ children }: Props) {
  return <div className="ab2-toolbar-filters">{children}</div>;
}
