'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileSpreadsheet, Package, PenLine, Plus } from 'lucide-react';
import { AppButton } from '@/components/ui/app-ui';
import { useRouter } from 'next/navigation';
import { uxToast } from '@/lib/ux/feedback';
import { MaterialCreateManualDialog } from '../../materials/MaterialCreateModal';

type Props = {
  canEdit: boolean;
  onCreated: () => void;
  onFromStock: () => void;
  /** Si fourni : ouvre la fiche matière unifiée (création) au lieu de la modale legacy. */
  onManualCreate?: () => void;
};

export function MaterialNewMaterialMenu({ canEdit, onCreated, onFromStock, onManualCreate }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };

  useEffect(() => {
    if (!menuOpen) return;
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
  }, [menuOpen]);

  if (!canEdit) return null;

  const items = [
    {
      icon: PenLine,
      label: 'Créer manuellement',
      action: () => {
        setMenuOpen(false);
        if (onManualCreate) {
          onManualCreate();
          return;
        }
        setManualOpen(true);
      },
    },
    {
      icon: Package,
      label: 'Créer depuis stock',
      action: () => {
        setMenuOpen(false);
        onFromStock();
      },
    },
    {
      icon: FileSpreadsheet,
      label: 'Importer Excel',
      action: () => {
        setMenuOpen(false);
        router.push('/administration/data-management');
        uxToast.info('Centre d\'import — onglet données matières / fusion Excel');
      },
    },
  ];

  const panel = menuOpen ? (
    <div
      ref={panelRef}
      className="mp-row-menu-panel is-portal orion-material-new-menu-panel"
      style={{ top: pos.top, right: pos.right }}
      role="menu"
    >
      {items.map((item) => (
        <button key={item.label} type="button" className="mp-row-menu-item" onClick={item.action}>
          <item.icon className="h-3.5 w-3.5 shrink-0" />
          {item.label}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <>
      <div className="mp-row-menu" ref={triggerRef}>
        <AppButton
          type="button"
          variant="default"
          className="orion-material-new-btn"
          onClick={() => {
            updatePosition();
            setMenuOpen((v) => !v);
          }}
          aria-expanded={menuOpen}
        >
          <Plus className="h-4 w-4" />
          Nouvelle matière
        </AppButton>
      </div>
      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
      {!onManualCreate ? (
        <MaterialCreateManualDialog
          open={manualOpen}
          onClose={() => setManualOpen(false)}
          onCreated={() => {
            setManualOpen(false);
            onCreated();
          }}
        />
      ) : null}
    </>
  );
}
