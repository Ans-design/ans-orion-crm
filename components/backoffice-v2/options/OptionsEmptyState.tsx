import type { ReactNode } from 'react';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

/**
 * Alias backoffice options — délègue au empty state Admin unifié.
 * Conservé pour ne pas casser les imports existants.
 */
export function OptionsEmptyState({ title, description, actions }: Props) {
  return <AdminEmptyState title={title} description={description} actions={actions} />;
}
