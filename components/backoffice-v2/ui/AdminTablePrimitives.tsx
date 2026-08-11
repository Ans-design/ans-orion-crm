'use client';

import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type AdminBadgeKind =
  | 'published'
  | 'draft'
  | 'unpublished'
  | 'anomaly'
  | 'muted'
  | 'stock-linked'
  | 'stock-unlinked';

const BADGE_CLASS: Record<AdminBadgeKind, string> = {
  published: 'is-published',
  draft: 'is-draft',
  unpublished: 'is-unpublished',
  anomaly: 'is-anomaly',
  muted: 'is-muted',
  'stock-linked': 'is-stock-linked',
  'stock-unlinked': 'is-stock-unlinked',
};

export function AdminTableBadge({ kind, label }: { kind: AdminBadgeKind; label: string }) {
  return <span className={cn('orion-admin-badge', BADGE_CLASS[kind])}>{label}</span>;
}

export function AdminArticleCell({
  icon,
  title,
  subtitle,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="orion-admin-table-cell-article">
      {icon && <span className="icon" aria-hidden>{icon}</span>}
      <div className="min-w-0">
        <span className="title" title={title}>{title}</span>
        {subtitle && <span className="sub" title={subtitle}>{subtitle}</span>}
      </div>
    </div>
  );
}

export function AdminStackCell({ line1, line2 }: { line1: string; line2?: string }) {
  return (
    <div className="orion-admin-table-cell-stack">
      <span className="line1 orion-admin-table-ellipsis" title={line1}>{line1}</span>
      {line2 && <span className="line2 orion-admin-table-ellipsis" title={line2}>{line2}</span>}
    </div>
  );
}

export function AdminPriceCell({ value, currency = 'Ar' }: { value: number | null | undefined; currency?: string }) {
  if (value == null || Number.isNaN(value)) {
    return <span className="orion-admin-table-muted">—</span>;
  }
  const formatted = new Intl.NumberFormat('fr-FR').format(value);
  return <span className="orion-admin-table-price">{formatted} {currency}</span>;
}

export function AdminAnomalySummary({
  critical = 0,
  warning = 0,
  primaryLabel,
}: {
  critical?: number;
  warning?: number;
  primaryLabel?: string;
}) {
  const total = critical + warning;
  if (total === 0) return <span className="orion-admin-table-muted">—</span>;

  const label = primaryLabel ?? (critical > 0 ? 'Critique' : 'À vérifier');
  const extra = total > 1 ? total - 1 : 0;

  return (
    <span className="orion-admin-anomaly-summary">
      <AdminTableBadge kind="anomaly" label={label} />
      {extra > 0 && <span className="orion-admin-anomaly-more">+{extra}</span>}
    </span>
  );
}

export function AdminPosSwitch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={cn('orion-admin-pos-switch', checked && 'is-on')}
      onClick={(e) => {
        e.stopPropagation();
        onChange?.(!checked);
      }}
    >
      <span className="orion-admin-pos-switch-knob" />
    </button>
  );
}

export type RowAction = {
  id: string;
  label: string;
  onClick: () => void;
  destructive?: boolean;
};

export function AdminRowActionsMenu({ actions }: { actions: RowAction[] }) {
  if (actions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="orion-admin-table-actions-btn"
          aria-label="Actions"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {actions.map((a, i) => (
          <div key={a.id}>
            {a.destructive && i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              className={a.destructive ? 'text-destructive focus:text-destructive' : undefined}
              onClick={(e) => {
                e.stopPropagation();
                a.onClick();
              }}
            >
              {a.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
