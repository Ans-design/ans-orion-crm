'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

type Props = {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function OptionsBlockAccordion({ title, count, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="ab2-block-accordion">
      <button type="button" className="ab2-block-accordion-head" onClick={() => setOpen(!open)}>
        <ChevronDown className={`h-4 w-4 transition-transform${open ? '' : ' -rotate-90'}`} />
        <span>{title}</span>
        <span className="ab2-badge ab2-badge-muted ml-auto">{count}</span>
      </button>
      {open && <div className="ab2-block-accordion-body">{children}</div>}
    </div>
  );
}
