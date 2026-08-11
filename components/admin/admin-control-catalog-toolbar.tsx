'use client';

import { Search, Eye } from 'lucide-react';
import { CAT_LABELS } from '@/lib/data/catalogue';
import type { AdminControlTabId } from '@/components/admin/admin-control-constants';

type Props = {
  tab: AdminControlTabId;
  search: string;
  onSearchChange: (value: string) => void;
  filterCat: string;
  onFilterCatChange: (value: string) => void;
  previewRole: 'commercial' | 'admin';
  onPreviewRoleChange: (role: 'commercial' | 'admin') => void;
  previewStats: { visible: number; greyed: number; hidden: number };
};

export function AdminControlCatalogToolbar({
  tab,
  search,
  onSearchChange,
  filterCat,
  onFilterCatChange,
  previewRole,
  onPreviewRoleChange,
  previewStats,
}: Props) {
  const showCategoryFilter = tab === 'articles' || tab === 'apercus';

  return (
    <div className="pta-catalog-toolbar">
      <div className="pta-toolbar-search-wrap">
        <Search size={14} className="pta-toolbar-search-icon" aria-hidden />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher…"
          className="pta-toolbar-search"
        />
      </div>

      {showCategoryFilter && (
        <select
          value={filterCat}
          onChange={(e) => onFilterCatChange(e.target.value)}
          className="pta-toolbar-select"
          aria-label="Filtrer par catégorie"
        >
          <option value="all">Toutes catégories</option>
          {Object.entries(CAT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      )}

      <div className="pta-toolbar-meta">
        <span className="inline-flex items-center gap-1.5">
          <Eye size={12} aria-hidden />
          Preview
          <select
            value={previewRole}
            onChange={(e) => onPreviewRoleChange(e.target.value as 'commercial' | 'admin')}
            className="pta-toolbar-select !w-auto !min-w-0 !px-1"
            aria-label="Rôle preview POS"
          >
            <option value="commercial">Vendeur</option>
            <option value="admin">Admin</option>
          </select>
        </span>
        <span>
          {previewStats.visible} visibles · {previewStats.greyed} grisés · {previewStats.hidden} masqués
        </span>
        <a
          href={`/pos?preview=draft&role=${previewRole}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1 rounded-[7px] bg-[var(--ans-pink-500)]/10 text-[var(--ans-pink-500)] font-semibold hover:opacity-90 transition-opacity"
        >
          Ouvrir POS preview →
        </a>
      </div>
    </div>
  );
}
