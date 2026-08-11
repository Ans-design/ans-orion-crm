'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  Layers,
  RefreshCw,
  Rocket,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { uxToast } from '@/lib/ux/feedback';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AppButton } from '@/components/ui/app-ui';

type PendingConfirm = {
  title: string;
  description: string;
  confirmLabel: string;
  variant?: 'default' | 'destructive';
  run: () => void;
};

type Props = {
  canEdit: boolean;
  publishing: boolean;
  syncing: boolean;
  onPublish: () => void;
  onSyncPos: () => void;
  onCreateFromTemplate: () => void;
};

export function CatalogueActionsMenu({
  canEdit,
  publishing,
  syncing,
  onPublish,
  onSyncPos,
  onCreateFromTemplate,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const ask = (cfg: PendingConfirm) => {
    setOpen(false);
    setPending(cfg);
  };

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

  const panel = open ? (
    <div
      ref={panelRef}
      className="mp-row-menu-panel is-portal orion-material-actions-panel"
      style={{ top: pos.top, right: pos.right }}
      role="menu"
    >
      <button type="button" className="mp-row-menu-item" onClick={() => { setOpen(false); onCreateFromTemplate(); }}>
        <Layers className="h-3.5 w-3.5 shrink-0" /> Créer depuis modèle
      </button>
      <button
        type="button"
        className="mp-row-menu-item"
        onClick={() => {
          setOpen(false);
          window.dispatchEvent(new CustomEvent('orion-catalogue-excel-import'));
        }}
      >
        <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" /> Importer Excel
      </button>
          <button
            type="button"
            className="mp-row-menu-item"
            onClick={() => {
              setOpen(false);
              void (async () => {
                try {
                  const r = await fetch('/api/export/catalog-pos', { cache: 'no-store' });
                  if (!r.ok) throw new Error('Export impossible');
                  const blob = await r.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `ans-orion-catalogue-pos-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  uxToast.success('Export JSON catalogue lancé');
                } catch {
                  uxToast.error('Export JSON indisponible');
                }
              })();
            }}
          >
            <Download className="h-3.5 w-3.5 shrink-0" /> Exporter JSON (audit)
          </button>
      <div className="orion-material-actions-sep" role="separator" />
      <button
        type="button"
        className="mp-row-menu-item"
        onClick={() =>
          ask({
            title: 'Synchroniser le catalogue vers le POS ?',
            description: 'Les articles publiés seront poussés vers le catalogue POS.',
            confirmLabel: 'Synchroniser',
            run: () => onSyncPos(),
          })
        }
        disabled={syncing}
      >
        <Upload className={`h-3.5 w-3.5 shrink-0${syncing ? ' animate-spin' : ''}`} /> Synchroniser POS
      </button>
      <button
        type="button"
        className="mp-row-menu-item"
        onClick={() =>
          ask({
            title: 'Publier toutes les modifications en brouillon ?',
            description: 'Les articles en brouillon seront publiés et visibles dans le POS.',
            confirmLabel: 'Publier',
            run: () => onPublish(),
          })
        }
        disabled={publishing}
      >
        <Rocket className={`h-3.5 w-3.5 shrink-0${publishing ? ' animate-spin' : ''}`} /> Publier les modifications
      </button>
      <button
        type="button"
        className="mp-row-menu-item"
        onClick={() => {
          setOpen(false);
          void (async () => {
            try {
              const r = await fetch('/api/admin-backoffice/catalogue-pos/import-excel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'detect-duplicates' }),
              });
              const d = await r.json();
              if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Détection impossible');
              const critical = d.data?.critical ?? 0;
              const warns = d.data?.warns ?? 0;
              const visible = d.data?.visiblePublishedEstimate ?? '?';
              uxToast.info(
                `Doublons : ${critical} critique(s), ${warns} avertissement(s) · ~${visible} articles POS visibles`,
              );
              if (critical > 0) {
                console.info('[catalogue-duplicates]', d.data?.hits?.slice?.(0, 30));
              }
            } catch (e) {
              uxToast.error(e instanceof Error ? e.message : 'Détection doublons impossible');
            }
          })();
        }}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" /> Détecter doublons catalogue
      </button>
      <button
        type="button"
        className="mp-row-menu-item"
        onClick={() =>
          ask({
            title: 'Fusionner les doublons personnalisés ?',
            description:
              'Fusionner les doublons « article / article personnalisé » (Bob, Casquette, Polo…) vers les articles catalogue. Les doublons seront archivés, pas supprimés.',
            confirmLabel: 'Fusionner',
            variant: 'destructive',
            run: () => {
              void (async () => {
                try {
                  const r = await fetch('/api/admin-backoffice/catalogue-pos/import-excel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'merge-personalized-duplicates' }),
                  });
                  const d = await r.json();
                  if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Fusion impossible');
                  const n = d.data?.archived ?? 0;
                  uxToast.success(`Fusion OK — ${n} doublon(s) archivé(s). Rechargez le POS.`);
                } catch (e) {
                  uxToast.error(e instanceof Error ? e.message : 'Fusion impossible');
                }
              })();
            },
          })
        }
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" /> Fusionner doublons personnalisés
      </button>
      <button
        type="button"
        className="mp-row-menu-item"
        onClick={() =>
          ask({
            title: 'Fusionner les variantes format/diamètre ?',
            description:
              'Fusionner les variantes (PVC, Photo GF, spirales par diamètre, collage A3/A4, plastification…) vers les articles principaux. Les variantes restent en Admin, pas en cartes POS.',
            confirmLabel: 'Fusionner',
            variant: 'destructive',
            run: () => {
              void (async () => {
                try {
                  const r = await fetch('/api/admin-backoffice/catalogue-pos/import-excel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'merge-variant-cards' }),
                  });
                  const d = await r.json();
                  if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Fusion impossible');
                  const n = d.data?.archived ?? 0;
                  uxToast.success(`Variantes fusionnées — ${n} carte(s) archivée(s). Rechargez le POS.`);
                } catch (e) {
                  uxToast.error(e instanceof Error ? e.message : 'Fusion impossible');
                }
              })();
            },
          })
        }
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" /> Fusionner variantes format/diamètre
      </button>
      <button
        type="button"
        className="mp-row-menu-item"
        onClick={() =>
          ask({
            title: 'Réattribuer les catégories incohérentes ?',
            description: 'Réattribuer automatiquement les catégories (Bob→Textiles, Cartes→Carterie, etc.).',
            confirmLabel: 'Réattribuer',
            run: () => {
              void (async () => {
                try {
                  const r = await fetch('/api/admin-backoffice/catalogue-pos/import-excel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'repair-categories' }),
                  });
                  const d = await r.json();
                  if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Réparation impossible');
                  uxToast.success(`Catégories réparées : ${d.data?.repaired ?? 0} article(s)`);
                  onSyncPos();
                } catch (e) {
                  uxToast.error(e instanceof Error ? e.message : 'Réparation catégories impossible');
                }
              })();
            },
          })
        }
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" /> Réattribuer catégories
      </button>
      <button
        type="button"
        className="mp-row-menu-item"
        onClick={() => {
          setOpen(false);
          router.push('/administration/backoffice?macro=system&module=audit&tab=anomalies');
        }}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" /> Voir anomalies globales
      </button>
      <button type="button" className="mp-row-menu-item" onClick={() => { setOpen(false); router.push('/administration/modeles-articles'); }}>
        <RefreshCw className="h-3.5 w-3.5 shrink-0" /> Gestion modèles (legacy)
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
