'use client';

import type { LucideIcon } from 'lucide-react';
import {
  ClipboardList, Factory, FileCheck, Truck, ReceiptText, History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ORION_TAB } from '@/lib/design/spacing-system';

const TAB_KEYS = ['Synthèse', 'Production', 'BAT & Studio', 'Logistique', 'Finance', 'Timeline'] as const;
export type OrderTab = (typeof TAB_KEYS)[number];

const TAB_ICONS: Record<OrderTab, LucideIcon> = {
  'Synthèse': ClipboardList,
  Production: Factory,
  'BAT & Studio': FileCheck,
  Logistique: Truck,
  Finance: ReceiptText,
  Timeline: History,
};

type TabBadge = Partial<Record<OrderTab, string>>;

type Props = {
  active: OrderTab;
  onChange: (tab: OrderTab) => void;
  badges?: TabBadge;
};

export function OrderTabs({ active, onChange, badges }: Props) {
  return (
    <div className={ORION_TAB.bar} role="tablist">
      {TAB_KEYS.map((t) => {
        const badge = badges?.[t];
        const isActive = active === t;
        const Icon = TAB_ICONS[t];
        return (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t)}
            className={cn(
              'orion-tab-btn',
              isActive ? 'orion-tab-btn--active' : 'orion-tab-btn--idle',
            )}
          >
            <Icon size={16} strokeWidth={1.75} className="shrink-0" aria-hidden />
            <span>{t}</span>
            {badge && (
              <span className={cn(
                'text-[10px] font-mono tabular-nums',
                isActive ? 'text-[var(--ans-red-500)]/80' : 'text-muted-foreground',
              )}>
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
