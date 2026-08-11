import { cn } from '@/lib/utils';

export type AdminStatusKind =
  | 'published'
  | 'draft'
  | 'unpublished'
  | 'anomaly'
  | 'missing-price'
  | 'stock-unlinked'
  | 'pos-visible'
  | 'pos-hidden'
  | 'review'
  | 'synced'
  | 'archived'
  | 'muted';

const STYLES: Record<AdminStatusKind, string> = {
  published: 'ab2-status-badge is-published',
  draft: 'ab2-status-badge is-draft',
  unpublished: 'ab2-status-badge is-unpublished',
  anomaly: 'ab2-status-badge is-anomaly',
  'missing-price': 'ab2-status-badge is-missing-price',
  'stock-unlinked': 'ab2-status-badge is-stock-unlinked',
  'pos-visible': 'ab2-status-badge is-pos-visible',
  'pos-hidden': 'ab2-status-badge is-pos-hidden',
  review: 'ab2-status-badge is-review',
  synced: 'ab2-status-badge is-synced',
  archived: 'ab2-status-badge is-archived',
  muted: 'ab2-status-badge is-muted',
};

type Props = {
  kind: AdminStatusKind;
  label: string;
  className?: string;
};

export function AdminStatusBadge({ kind, label, className }: Props) {
  return <span className={cn(STYLES[kind], className)}>{label}</span>;
}

export function formulaStatusKind(status: string): AdminStatusKind {
  if (status === 'published') return 'published';
  if (status === 'draft') return 'draft';
  return 'muted';
}

export function publicationStatusKind(status: string): AdminStatusKind {
  if (status === 'synced') return 'synced';
  if (status === 'draft') return 'draft';
  return 'archived';
}
