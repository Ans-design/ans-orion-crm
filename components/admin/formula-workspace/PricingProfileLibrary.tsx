'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import {
  calculationLabelFr,
  displayProfileLabel,
  filterFormulaProfiles,
  resolveProfileListState,
  uniqueFamilies,
  type FormulaProfileLike,
  type FormulaProfileStatusFilter,
} from '@/lib/pricing/formula-display';

type Props = {
  profiles: FormulaProfileLike[];
  selectedId: string | null;
  onSelect: (articleId: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

const FILTERS: { id: FormulaProfileStatusFilter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'active', label: 'Actifs POS' },
  { id: 'draft', label: 'À compléter' },
  { id: 'no_formula', label: 'Sans formule' },
  { id: 'archived', label: 'Archivés' },
];

export function PricingProfileLibrary({
  profiles,
  selectedId,
  onSelect,
  collapsed,
  onToggleCollapse,
}: Props) {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<FormulaProfileStatusFilter>('all');
  const [family, setFamily] = useState<string | 'all'>('all');

  const families = useMemo(() => uniqueFamilies(profiles), [profiles]);
  const filtered = useMemo(
    () =>
      filterFormulaProfiles(profiles, {
        query: q,
        statusFilter,
        family,
        includeArchived: statusFilter === 'archived',
      }),
    [profiles, q, statusFilter, family],
  );

  if (collapsed) {
    return (
      <aside className="fw-library fw-library--collapsed">
        <button
          type="button"
          className="fw-icon-btn"
          onClick={onToggleCollapse}
          aria-label="Développer la bibliothèque"
          title="Développer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="fw-library" aria-label="Bibliothèque de profils tarifaires">
      <div className="fw-library__head">
        <div className="fw-library__title-row">
          <div>
            <h3 className="fw-library__title">Profils tarifaires</h3>
            <p className="fw-library__count">{filtered.length} / {profiles.length}</p>
          </div>
          {onToggleCollapse ? (
            <button
              type="button"
              className="fw-icon-btn"
              onClick={onToggleCollapse}
              aria-label="Réduire la bibliothèque"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <label className="fw-search">
          <Search className="fw-search__icon" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nom, référence, famille…"
            className="fw-search__input"
          />
        </label>
        <label className="fw-field fw-field--full">
          <span className="fw-field__label">Filtre</span>
          <select
            className="fw-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FormulaProfileStatusFilter)}
            aria-label="Filtrer les profils par statut"
          >
            {FILTERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        {families.length > 0 ? (
          <label className="fw-field fw-field--full">
            <span className="fw-field__label">Famille</span>
            <select
              className="fw-select"
              value={family}
              onChange={(e) => setFamily(e.target.value)}
            >
              <option value="all">Toutes</option>
              {families.map((fam) => (
                <option key={fam} value={fam}>
                  {fam}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <ul className="fw-profile-list" aria-label="Profils">
        {filtered.map((p) => {
          const state = resolveProfileListState(p);
          const active = selectedId === p.articleId;
          return (
            <li key={p.articleId}>
              <button
                type="button"
                className={cn('fw-profile-item', active && 'is-selected')}
                aria-pressed={active}
                onClick={() => onSelect(p.articleId)}
              >
                <span className="fw-profile-item__row">
                  <span className="fw-profile-item__name">{displayProfileLabel(p.articleLabel)}</span>
                  <span className={cn('fw-profile-item__badge', `tone-${state.tone}`)}>
                    {state.primary}
                  </span>
                </span>
                <span className="fw-profile-item__meta">
                  {(p.family ?? 'Sans famille')}
                  {' · '}
                  {calculationLabelFr(p.calculationType)}
                  {' · '}
                  {state.detail}
                </span>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 ? (
          <li className="list-none px-2 py-1">
            <AdminEmptyState title="Aucun profil pour ces filtres" className="py-6" />
          </li>
        ) : null}
      </ul>
    </aside>
  );
}
