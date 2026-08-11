'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, Info, CheckCircle2, ChevronDown, ChevronUp,
} from 'lucide-react';

export type CockpitAlertItem = { type: string; label: string; href: string; priority?: number };

type AlertLevel = 'danger' | 'warning' | 'info' | 'success';

const LEVEL_CLASS: Record<AlertLevel, string> = {
  danger: 'cockpit-alert-danger',
  warning: 'cockpit-alert-warning',
  info: 'cockpit-alert-info',
  success: 'cockpit-alert-success',
};

const DANGER_TYPES = new Set(['urgent', 'machine', 'stock', 'finance', 'gpao']);
const WARNING_TYPES = new Set(['retard', 'task', 'incident', 'reclamation', 'facture', 'rh-retard']);
const INFO_TYPES = new Set(['devis', 'rh', 'bat', 'task-due']);

function resolveLevel(type: string): AlertLevel {
  if (DANGER_TYPES.has(type)) return 'danger';
  if (WARNING_TYPES.has(type)) return 'warning';
  if (INFO_TYPES.has(type)) return 'info';
  return 'warning';
}

function LevelIcon({ level }: { level: AlertLevel }) {
  if (level === 'info') return <Info size={15} className="shrink-0" />;
  if (level === 'success') return <CheckCircle2 size={15} className="shrink-0" />;
  return <AlertTriangle size={15} className="shrink-0" />;
}

const MAX_VISIBLE = 4;

type Props = {
  alertes: CockpitAlertItem[];
};

export function CockpitAlerts({ alertes }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  if (alertes.length === 0) {
    return (
      <div className="cockpit-alert cockpit-alert-success w-full">
        <CheckCircle2 size={16} className="shrink-0" />
        <span>Tout est à jour — aucune alerte critique</span>
      </div>
    );
  }

  const sorted = [...alertes].sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9));
  const counts = sorted.reduce(
    (acc, a) => {
      const level = resolveLevel(a.type);
      acc[level] += 1;
      return acc;
    },
    { danger: 0, warning: 0, info: 0, success: 0 },
  );

  const visible = expanded ? sorted : sorted.slice(0, MAX_VISIBLE);
  const hiddenCount = sorted.length - MAX_VISIBLE;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {counts.danger > 0 && (
          <span className="font-semibold cockpit-count-danger">{counts.danger} critique{counts.danger > 1 ? 's' : ''}</span>
        )}
        {counts.danger > 0 && counts.warning > 0 && <span aria-hidden>·</span>}
        {counts.warning > 0 && (
          <span className="font-semibold cockpit-count-warning">{counts.warning} avertissement{counts.warning > 1 ? 's' : ''}</span>
        )}
        {(counts.danger > 0 || counts.warning > 0) && counts.info > 0 && <span aria-hidden>·</span>}
        {counts.info > 0 && (
          <span className="font-semibold cockpit-count-info">{counts.info} info</span>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((a) => {
          const level = resolveLevel(a.type);
          return (
            <button
              key={`${a.type}-${a.label}`}
              type="button"
              onClick={() => router.push(a.href)}
              className={`cockpit-alert ${LEVEL_CLASS[level]} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2`}
            >
              <LevelIcon level={level} />
              <span className="truncate">{a.label}</span>
            </button>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 rounded-md px-1"
        >
          {expanded ? (
            <>Réduire les alertes <ChevronUp size={14} /></>
          ) : (
            <>Voir toutes les alertes ({sorted.length}) <ChevronDown size={14} /></>
          )}
        </button>
      )}
    </div>
  );
}
