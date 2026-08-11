'use client';

type NavBadgeCounts = {
  commandes: number;
  devis: number;
  reclamations: number;
  ansTalk: number;
  stockAlerts: number;
  tasksOpen: number;
  livraisons: number;
};

type Props = {
  count: number;
  variant?: 'item' | 'universe';
  urgent?: boolean;
};

export function SidebarBadge({ count, variant = 'item', urgent }: Props) {
  if (count <= 0) return null;

  const label = count > 99 ? '99+' : String(count);

  return (
    <span
      className={`orion-sb-badge ${variant === 'universe' ? 'orion-sb-badge-universe' : ''} ${urgent ? 'orion-sb-badge-urgent' : ''}`}
      aria-label={`${count} élément${count > 1 ? 's' : ''} à traiter`}
    >
      {label}
    </span>
  );
}

export type { NavBadgeCounts };
