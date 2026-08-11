import { StatBadge } from '@/components/ui/stat-badge';

export type OrionStatusBadgeProps = React.ComponentProps<typeof StatBadge>;

/** Badge de statut métier (commande, devis, facture…). */
export function OrionStatusBadge(props: OrionStatusBadgeProps) {
  return <StatBadge {...props} />;
}
