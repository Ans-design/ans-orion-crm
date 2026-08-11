'use client';

/**
 * Menu contextuel matière (⋯) — legacy.
 * Masqué dans MaterialPriceRowActions : actions déjà couvertes
 * (Modifier / Dupliquer / Archiver + ouverture fiche au clic sur la matière).
 * Conservé pour alias / réactivation éventuelle.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Pencil, Copy, Archive, Trash2, Package, Eye, Upload, RotateCcw, Link2 } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { MaterialPriceUnifiedRow } from './types';
import { ADMIN_UI, adminStatusLabel } from '@/lib/administration/admin-ui-vocab';

type UnifiedRow = MaterialPriceUnifiedRow;

type PendingConfirm = {
  title: string;
  description: string;
  confirmLabel: string;
  variant?: 'default' | 'destructive';
  run: () => void | Promise<void>;
};

type Props = {
  row: UnifiedRow;
  canEdit: boolean;
  open?: boolean;
  onChanged: () => void;
  onQuickEdit: (row: UnifiedRow) => void;
  onViewDetails: (row: UnifiedRow) => void;
  onViewUsage: (row: UnifiedRow) => void;
  onLinkStock: (row: UnifiedRow) => void;
  onOpenChange?: (open: boolean) => void;
};

export function MaterialPriceRowMenu({
  row,
  canEdit,
  open: openControlled,
  onChanged,
  onQuickEdit,
  onViewDetails,
  onViewUsage,
  onLinkStock,
  onOpenChange,
}: Props) {
  const [openInternal, setOpenInternal] = useState(false);
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const isControlled = openControlled !== undefined;
  const open = isControlled ? openControlled : openInternal;
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isPrintOnly = row.id.startsWith('print-');

  const setMenuOpen = useCallback((next: boolean) => {
    if (!isControlled) setOpenInternal(next);
    onOpenChange?.(next);
  }, [isControlled, onOpenChange]);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, setMenuOpen, updatePosition]);

  const patchPublish = async () => {
    if (isPrintOnly) return;
    const r = await fetch(`/api/admin-backoffice/pricing/base-material-prices/${row.id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ basePrintingPriceId: row.basePrintingPriceId }),
    });
    const d = await r.json();
    if (r.ok && d.ok) {
      uxToast.success('Ligne publiée — POS mis à jour');
      onChanged();
    } else {
      uxToast.error(getApiErrorMessage(d, 'Publication impossible'));
    }
    setMenuOpen(false);
  };

  const ask = (cfg: PendingConfirm) => {
    setMenuOpen(false);
    setPending(cfg);
  };

  const duplicate = async () => {
    if (isPrintOnly) {
      uxToast.error('Créez d\'abord une matière liée depuis stock ou catalogue');
      setMenuOpen(false);
      return;
    }
    ask({
      title: 'Dupliquer cette matière ?',
      description: 'Une copie en brouillon sera créée.',
      confirmLabel: 'Dupliquer',
      run: async () => {
        const r = await fetch(`/api/admin-backoffice/pricing/base-materials/${row.id}/duplicate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grammage: row.grammage }),
        });
        const d = await r.json();
        if (r.ok && d.ok) {
          uxToast.success('Matière dupliquée (brouillon)');
          onChanged();
        } else {
          uxToast.error(getApiErrorMessage(d, 'Erreur'));
        }
      },
    });
  };

  const archive = async () => {
    if (isPrintOnly) return;
    ask({
      title: 'Archiver cette matière ?',
      description: 'La matière sera conservée pour l\'historique.',
      confirmLabel: 'Archiver',
      variant: 'destructive',
      run: async () => {
        const r = await fetch(`/api/admin-backoffice/pricing/base-materials/${row.id}/archive`, { method: 'POST' });
        const d = await r.json();
        if (r.ok && d.ok) {
          uxToast.success('Archivée');
          onChanged();
        } else {
          uxToast.error(getApiErrorMessage(d, 'Erreur'));
        }
      },
    });
  };

  const remove = async () => {
    if (isPrintOnly) return;
    ask({
      title: 'Archiver cette matière ?',
      description: 'Soft-delete — aucune suppression définitive.',
      confirmLabel: 'Archiver',
      variant: 'destructive',
      run: async () => {
        const r = await fetch(`/api/admin-backoffice/pricing/base-materials/${row.id}/archive`, { method: 'POST' });
        const d = await r.json();
        if (r.ok && d.ok) {
          uxToast.success('Archivée');
          onChanged();
        } else {
          uxToast.error(getApiErrorMessage(d, 'Erreur'));
        }
      },
    });
  };

  const items = [
    { icon: Pencil, label: 'Modifier rapidement', action: () => { onQuickEdit(row); setMenuOpen(false); } },
    { icon: Eye, label: 'Ouvrir la fiche', action: () => { onViewDetails(row); setMenuOpen(false); } },
    { icon: Copy, label: 'Dupliquer', action: duplicate, hide: !canEdit },
    { icon: Link2, label: 'Lier au stock', action: () => { onLinkStock(row); setMenuOpen(false); }, hide: !canEdit },
    { icon: Package, label: 'Créer SKU', action: () => { window.open('/stock', '_blank'); setMenuOpen(false); } },
    { icon: Eye, label: 'Usages produits', action: () => { onViewUsage(row); setMenuOpen(false); } },
    { icon: Upload, label: 'Publier cette ligne', action: patchPublish, hide: !canEdit || row.publicationStatus === 'published' || isPrintOnly },
    { icon: RotateCcw, label: 'Restaurer brouillon', action: () => { onQuickEdit(row); setMenuOpen(false); }, hide: row.publicationStatus !== 'published' },
    { icon: Archive, label: 'Archiver', action: archive, hide: !canEdit || isPrintOnly },
    { icon: Trash2, label: 'Archiver…', action: remove, hide: !canEdit || isPrintOnly, danger: true },
  ].filter((i) => !i.hide);

  const panel = open ? (
    <div
      ref={panelRef}
      className="mp-row-menu-panel is-portal"
      style={{ top: pos.top, right: pos.right }}
      role="menu"
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          className={`mp-row-menu-item ${item.danger ? 'is-danger' : ''}`}
          onClick={item.action}
        >
          <item.icon className="h-3.5 w-3.5 shrink-0" />
          {item.label}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <>
    <div className={`mp-row-menu${open ? ' is-open' : ''}`} ref={triggerRef}>
      <button
        type="button"
        className="mp-row-menu-trigger"
        onClick={() => {
          const next = !open;
          if (next) updatePosition();
          setMenuOpen(next);
        }}
        aria-label="Actions"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </div>
    <ConfirmDialog
      open={Boolean(pending)}
      onOpenChange={(next) => {
        if (!next) setPending(null);
      }}
      title={pending?.title ?? ''}
      description={pending?.description}
      confirmLabel={pending?.confirmLabel}
      variant={pending?.variant}
      onConfirm={() => {
        void pending?.run();
        setPending(null);
      }}
    />
    </>
  );
}

export function MaterialAnomalyPills({ anomalies }: { anomalies: string[] }) {
  if (!anomalies.length) return <span className="orion-admin-table-muted">—</span>;
  const primary = anomalies[0] ?? 'Anomalie';
  const extra = anomalies.length - 1;
  return (
    <span className="orion-admin-anomaly-summary" title={anomalies.join(' · ')}>
      <span className="orion-admin-badge is-anomaly">{primary}</span>
      {extra > 0 && <span className="orion-admin-anomaly-more">+{extra}</span>}
    </span>
  );
}

export function MaterialStatusBadge({ status }: { status: string }) {
  const kind =
    status === 'published' ? 'published' : status === 'archived' ? 'unpublished' : 'draft';
  const label =
    status === 'published'
      ? adminStatusLabel('published')
      : status === 'archived'
        ? adminStatusLabel('archived')
        : ADMIN_UI.status.draft;
  return <span className={`orion-admin-badge is-${kind}`}>{label}</span>;
}

function formatDetails(row: UnifiedRow) {
  const parts = [row.grammage, row.formatLabel ?? row.format, row.face].filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
}

export function MaterialDetailsCell({ row }: { row: UnifiedRow }) {
  return <span className="mp-details-cell" title={formatDetails(row)}>{formatDetails(row)}</span>;
}

export function MaterialUnitCell({ row }: { row: UnifiedRow }) {
  const u = row.unitDisplay ?? row.unit;
  if (!u) return <span className="mp-muted">—</span>;
  if (row.unitStandard && row.unitStandard !== u && row.conversionFactor) {
    return (
      <span className="mp-unit-cell" title={`1 ${u} = ${row.conversionFactor} ${row.unitStandard}`}>
        {u} → {row.conversionFactor} {row.unitStandard}
      </span>
    );
  }
  return <span className="mp-unit-cell">{u}</span>;
}
