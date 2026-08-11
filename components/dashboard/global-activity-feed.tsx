'use client';

import { useRouter } from 'next/navigation';
import { Activity } from 'lucide-react';
import Link from 'next/link';

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
  STATUS_CHANGE: 'Statut',
  FILE_UPLOAD: 'Upload fichier',
  FILE_DOWNLOAD: 'Téléchargement',
  COMMANDE_BLOCAGE: 'Blocage',
  COMMANDE_DEBLOCAGE: 'Déblocage',
  WORKFLOW_FACTURE: 'Facture auto',
};

type AuditItem = {
  action: string;
  entity: string;
  entityId?: string;
  entityLabel?: string;
  userName?: string;
  createdAt: string;
};

type Props = {
  items: AuditItem[];
  onOpenEntity?: (entity: string, id: string) => void;
  maxHeight?: string;
};

export function GlobalActivityFeed({ items, onOpenEntity, maxHeight = 'max-h-[220px]' }: Props) {
  const router = useRouter();

  const handleClick = (a: AuditItem) => {
    if (onOpenEntity && a.entityId) {
      onOpenEntity(a.entity, a.entityId);
      return;
    }
    if (a.entity === 'Commande' && a.entityId) router.push(`/commandes/${a.entityId}`);
    else router.push(`/historique?search=${encodeURIComponent(a.entityLabel || a.entity)}`);
  };

  return (
    <div className={`dashboard-chart-card rounded-[7px]`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-sm flex items-center gap-2">
          <Activity size={14} className="text-[var(--info)]" /> Fil d&apos;activité
        </h2>
        <Link href="/historique" className="text-xs text-[var(--brand-primary)] hover:underline font-medium">
          Tout voir
        </Link>
      </div>
      <div className={`space-y-2 ${maxHeight} overflow-y-auto`}>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Aucune activité récente</p>
        ) : (
          items.map((a, i) => (
            <button
              key={`${a.entityId}-${a.createdAt}-${i}`}
              type="button"
              onClick={() => handleClick(a)}
              className="cockpit-list-item flex items-start gap-2 text-xs text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <Activity size={12} className="text-[var(--text-muted)] mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="font-medium text-[var(--text-primary)]">
                  {a.userName ? `${a.userName} — ` : ''}
                  {ACTION_LABELS[a.action] || a.action}
                </span>
                <span className="text-[var(--text-secondary)]"> {a.entityLabel || a.entity}</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(a.createdAt).toLocaleString('fr-FR')}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
