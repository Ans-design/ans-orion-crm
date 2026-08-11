'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Command } from 'lucide-react';
import {
  ADMIN_BACKOFFICE_MODULES,
  type AdminBackofficeModuleId,
} from '@/lib/backoffice/admin-modules';
import type { AdminBackofficeTabId } from '@/lib/server/modules/backoffice-v2/admin-backoffice.types';

type Props = {
  open: boolean;
  onClose: () => void;
  onNavigate: (moduleId: AdminBackofficeModuleId, tab?: AdminBackofficeTabId) => void;
};

export function AdminCommandPalette({ open, onClose, onNavigate }: Props) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const items = ADMIN_BACKOFFICE_MODULES.flatMap((mod) => {
    const base = [{ id: mod.id, label: mod.label, sub: mod.description, tab: mod.defaultTab }];
    const tabs = mod.tabs
      .filter((t) => t.id !== mod.defaultTab)
      .map((t) => ({ id: mod.id, label: `${mod.label} › ${t.label}`, sub: mod.description, tab: t.id }));
    return [...base, ...tabs];
  }).filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return item.label.toLowerCase().includes(q) || item.sub.toLowerCase().includes(q);
  });

  const pick = useCallback((moduleId: AdminBackofficeModuleId, tab?: AdminBackofficeTabId) => {
    onNavigate(moduleId, tab);
    onClose();
  }, [onNavigate, onClose]);

  if (!open) return null;

  return (
    <div className="ab2-cmd-overlay" role="dialog" aria-modal aria-label="Commande rapide">
      <button type="button" className="ab2-cmd-backdrop" onClick={onClose} aria-label="Fermer" />
      <div className="ab2-cmd-panel">
        <div className="ab2-cmd-search">
          <Search className="h-4 w-4 shrink-0 opacity-50" />
          <input
            autoFocus
            type="search"
            className="ab2-cmd-input"
            placeholder="Aller à un module, onglet ou action…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="ab2-cmd-kbd">Esc</kbd>
        </div>
        <ul className="ab2-cmd-list">
          {items.length === 0 && (
            <li className="ab2-cmd-empty">Aucun résultat</li>
          )}
          {items.map((item) => (
            <li key={`${item.id}-${item.tab}`}>
              <button
                type="button"
                className="ab2-cmd-item"
                onClick={() => pick(item.id, item.tab)}
              >
                <Command className="h-3.5 w-3.5 shrink-0 opacity-40" />
                <span>
                  <span className="ab2-cmd-item-label">{item.label}</span>
                  <span className="ab2-cmd-item-sub">{item.sub}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Raccourci global Ctrl+K */
export function useAdminCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return { open, setOpen };
}
