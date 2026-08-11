'use client';

import { adminStatusLabel } from '@/lib/administration/admin-ui-vocab';
import { AppButton } from '@/components/ui/app-ui';

type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  family: string;
  onFamilyChange: (v: string) => void;
  families: string[];
  onReset: () => void;
};

export function BackofficeArticlePriceFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  family,
  onFamilyChange,
  families,
  onReset,
}: Props) {
  return (
    <div className="ab2-toolbar">
      <input
        type="search"
        className="ab2-input min-w-[12rem]"
        placeholder="Rechercher article…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <select className="ab2-input" value={status} onChange={(e) => onStatusChange(e.target.value)} aria-label="Statut">
        <option value="all">Tous statuts</option>
        <option value="published">{adminStatusLabel('published')}</option>
        <option value="draft">{adminStatusLabel('draft')}</option>
        <option value="archived">{adminStatusLabel('archived')}</option>
      </select>
      <select className="ab2-input" value={family} onChange={(e) => onFamilyChange(e.target.value)} aria-label="Famille">
        <option value="all">Toutes familles</option>
        {families.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>
      <AppButton type="button" variant="ghost" onClick={onReset}>Réinitialiser</AppButton>
    </div>
  );
}
