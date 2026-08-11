import { memo } from 'react';
import { ADMIN_UI } from '@/lib/administration/admin-ui-vocab';

type Props = {
  status: string;
  compact?: boolean;
};

export const ArticleStatusBadge = memo(function ArticleStatusBadge({ status, compact }: Props) {
  const active = status === 'published' || status === 'active';
  const archived = status === 'archived';
  return (
    <span
      className={`acat-badge ${active ? 'acat-badge-active' : archived ? 'acat-badge-archived' : 'acat-badge-draft'}${compact ? ' acat-badge-xs' : ''}`}
    >
      {archived ? ADMIN_UI.status.archived : active ? ADMIN_UI.status.active : ADMIN_UI.status.incomplete}
    </span>
  );
});
