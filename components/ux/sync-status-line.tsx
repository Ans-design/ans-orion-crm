'use client';

import { RefreshCw } from 'lucide-react';

type Props = {
  /** Texte principal, ex. « Catalogue synchronisé » */
  label: string;
  /** Détail optionnel, ex. dernière mise à jour */
  detail?: string;
  busy?: boolean;
  tone?: 'ok' | 'warn' | 'neutral';
  onRefresh?: () => void;
  refreshLabel?: string;
  className?: string;
};

export function SyncStatusLine({
  label,
  detail,
  busy = false,
  tone = 'neutral',
  onRefresh,
  refreshLabel = 'Rafraîchir',
  className = '',
}: Props) {
  const dotClass = busy
    ? 'orion-ux-sync-dot--busy'
    : tone === 'ok'
      ? 'orion-ux-sync-dot--ok'
      : tone === 'warn'
        ? 'orion-ux-sync-dot--warn'
        : 'orion-ux-sync-dot--ok';

  return (
    <div
      className={`orion-ux-sync-line${busy ? ' orion-ux-sync-line--busy' : ''} orion-ux-fade-in ${className}`}
      role="status"
      aria-live="polite"
      aria-busy={busy}
    >
      <span className={`orion-ux-sync-dot ${dotClass}`} aria-hidden />
      <span className="font-medium text-[var(--text-main)]">{label}</span>
      {detail && <span className="text-[var(--text-subtle)]">{detail}</span>}
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className="ml-auto inline-flex items-center gap-1 text-[var(--brand-primary)] hover:underline disabled:opacity-50 text-xs font-semibold"
        >
          <RefreshCw size={12} className={busy ? 'animate-spin' : ''} aria-hidden />
          {refreshLabel}
        </button>
      )}
    </div>
  );
}
