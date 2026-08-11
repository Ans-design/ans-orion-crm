'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  Package,
  RefreshCw,
  Sparkles,
  Upload,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AppButton } from '@/components/ui/app-ui';

type Props = {
  canEdit: boolean;
  merging: boolean;
  completingCatalog?: boolean;
  backfillingPrices?: boolean;
  onFromStock: () => void;
  onCompleteFromCatalog?: () => void;
  onCleanDuplicates: (dryRun: boolean) => void;
  onSyncPos: () => void;
  onGenerateReferences?: (mode: 'missing' | 'all') => void;
  onReorganizeIds?: () => void;
  onDownloadTemplate?: () => void;
  onExportMissingPrices?: () => void;
  onBackfillPrices?: () => void;
};

type PendingConfirm = {
  title: string;
  description: string;
  confirmLabel: string;
  variant?: 'default' | 'destructive';
  run: () => void;
};

export function MaterialsActionsMenu({
  canEdit,
  merging,
  completingCatalog = false,
  backfillingPrices = false,
  onFromStock,
  onCompleteFromCatalog,
  onCleanDuplicates,
  onSyncPos,
  onGenerateReferences,
  onReorganizeIds,
  onDownloadTemplate,
  onExportMissingPrices,
  onBackfillPrices,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  if (!canEdit) return null;

  const ask = (cfg: PendingConfirm) => {
    setOpen(false);
    setPending(cfg);
  };

  const panel = open ? (
    <div
      ref={panelRef}
      className="mp-row-menu-panel is-portal orion-material-actions-panel"
      style={{ top: pos.top, right: pos.right }}
      role="menu"
    >
      <button type="button" className="mp-row-menu-item" onClick={() => { setOpen(false); onFromStock(); }}>
        <Package className="h-3.5 w-3.5 shrink-0" /> Créer depuis stock
      </button>
      {onCompleteFromCatalog ? (
        <button
          type="button"
          className="mp-row-menu-item"
          disabled={completingCatalog}
          onClick={() =>
            ask({
              title: 'Compléter depuis le catalogue ?',
              description: 'Le référentiel sera enrichi sans écraser les prix déjà saisis.',
              confirmLabel: 'Compléter',
              run: () => onCompleteFromCatalog(),
            })
          }
        >
          <Sparkles className={`h-3.5 w-3.5 shrink-0${completingCatalog ? ' animate-spin' : ''}`} />
          Compléter depuis le catalogue
        </button>
      ) : null}
      <button type="button" className="mp-row-menu-item" onClick={() => { setOpen(false); onDownloadTemplate?.(); }}>
        <Package className="h-3.5 w-3.5 shrink-0" /> Modèle Excel exemple
      </button>
      {onExportMissingPrices ? (
        <button
          type="button"
          className="mp-row-menu-item"
          onClick={() => { setOpen(false); onExportMissingPrices(); }}
        >
          <Upload className="h-3.5 w-3.5 shrink-0" /> Exporter matières sans prix
        </button>
      ) : null}
      {onBackfillPrices ? (
        <button
          type="button"
          className="mp-row-menu-item"
          disabled={backfillingPrices}
          onClick={() =>
            ask({
              title: 'Compléter les prix depuis les sources ?',
              description:
                'Remplit automatiquement les prix base depuis ISF / BasePrintingPrice / stock. Les prix déjà saisis ne sont pas écrasés.',
              confirmLabel: 'Compléter les prix',
              run: () => onBackfillPrices(),
            })
          }
        >
          <Sparkles className={`h-3.5 w-3.5 shrink-0${backfillingPrices ? ' animate-spin' : ''}`} />
          Compléter prix depuis sources
        </button>
      ) : null}
      <button
        type="button"
        className="mp-row-menu-item"
        onClick={() => { setOpen(false); onGenerateReferences?.('missing'); }}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" /> Générer références manquantes
      </button>
      <button
        type="button"
        className="mp-row-menu-item"
        onClick={() =>
          ask({
            title: 'Régénérer toutes les références ?',
            description: 'Les références existantes seront remplacées.',
            confirmLabel: 'Régénérer',
            variant: 'destructive',
            run: () => onGenerateReferences?.('all'),
          })
        }
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" /> Régénérer toutes les références
      </button>
      <button type="button" className="mp-row-menu-item" onClick={() => { setOpen(false); onReorganizeIds?.(); }}>
        <RefreshCw className="h-3.5 w-3.5 shrink-0" /> Réorganiser ID Excel
      </button>
      <div className="orion-material-actions-sep" role="separator" />
      <button type="button" className="mp-row-menu-item" onClick={() => { setOpen(false); onCleanDuplicates(true); }} disabled={merging}>
        <Sparkles className="h-3.5 w-3.5 shrink-0" /> Simuler nettoyage
      </button>
      <button
        type="button"
        className="mp-row-menu-item"
        disabled={merging}
        onClick={() =>
          ask({
            title: 'Fusionner les doublons détectés ?',
            description: 'Cette action archive les lignes en trop (aucune suppression définitive).',
            confirmLabel: 'Nettoyer les doublons',
            variant: 'destructive',
            run: () => onCleanDuplicates(false),
          })
        }
      >
        <RefreshCw className={`h-3.5 w-3.5 shrink-0${merging ? ' animate-spin' : ''}`} /> Nettoyer doublons
      </button>
      <button
        type="button"
        className="mp-row-menu-item"
        onClick={() =>
          ask({
            title: 'Synchroniser le catalogue vers le POS ?',
            description: 'Les matières actives seront poussées vers le catalogue POS.',
            confirmLabel: 'Synchroniser',
            run: () => onSyncPos(),
          })
        }
      >
        <Upload className="h-3.5 w-3.5 shrink-0" /> Synchroniser POS
      </button>
    </div>
  ) : null;

  return (
    <>
      <div className="mp-row-menu" ref={triggerRef}>
        <AppButton
          type="button"
          variant="outline"
          className="text-sm orion-material-actions-trigger"
          onClick={() => { updatePosition(); setOpen((v) => !v); }}
          aria-expanded={open}
        >
          Actions
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </AppButton>
      </div>
      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
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
          pending?.run();
          setPending(null);
        }}
      />
    </>
  );
}
