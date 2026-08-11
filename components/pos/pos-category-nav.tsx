'use client';

import { useMemo, useState } from 'react';
import { posFamilyAccent, posFamilyGroup } from '@/lib/pos/pos-family-accents';
import '@/styles/pos-category-nav.css';

export type PosCategoryNavItem = {
  id: string;
  label: string;
  color?: string;
};

type Props = {
  categories: PosCategoryNavItem[];
  counts: Record<string, number>;
  selectedId: string;
  onSelect: (id: string) => void;
};

function resolveAccent(cat: PosCategoryNavItem): string {
  return posFamilyAccent(cat.id);
}

function formatCount(n: number): string {
  return String(Math.max(0, n)).padStart(2, '0');
}

export function PosCategoryNav({ categories, counts, selectedId, onSelect }: Props) {
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('fr');
    if (!q) return categories;
    return categories.filter((cat) => {
      const hay = `${cat.label} ${posFamilyGroup(cat.id)} ${cat.id}`.toLocaleLowerCase('fr');
      return hay.includes(q);
    });
  }, [categories, query]);

  const status = query.trim()
    ? `${visible.length} catégorie${visible.length > 1 ? 's' : ''} trouvée${visible.length > 1 ? 's' : ''}`
    : 'Cliquez sur une catégorie pour afficher les produits.';

  return (
    <section className="pos-cat-nav" aria-label="Catégories d’articles">
      <header className="pos-cat-nav__header">
        <div className="pos-cat-nav__heading">
          <p className="pos-cat-nav__kicker">Catalogue</p>
          <h2 className="pos-cat-nav__title">Catégories</h2>
          <p className="pos-cat-nav__subtitle">
            Choisissez une catégorie pour afficher les produits correspondants.
          </p>
        </div>
        <input
          className="pos-cat-nav__search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une catégorie…"
          aria-label="Rechercher une catégorie"
        />
      </header>

      {visible.length > 0 ? (
        <div className="pos-cat-nav__grid" role="navigation" aria-label="Familles catalogue">
          {visible.map((cat) => {
            const active = selectedId === cat.id;
            const count = counts[cat.id] ?? 0;
            const accent = resolveAccent(cat);
            return (
              <button
                key={cat.id}
                type="button"
                className={`pos-cat-nav__item${active ? ' is-active' : ''}`}
                style={{ ['--accent' as string]: accent }}
                aria-pressed={active}
                title={cat.label}
                onClick={() => onSelect(cat.id)}
              >
                <span className="pos-cat-nav__name" style={{ color: accent }}>{cat.label}</span>
                <span className="pos-cat-nav__family">{posFamilyGroup(cat.id)}</span>
                <span className="pos-cat-nav__count" style={{ color: accent }} aria-label={`${count} articles`}>
                  {formatCount(count)}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="pos-cat-nav__empty">Aucune catégorie ne correspond à votre recherche.</p>
      )}

      <footer className="pos-cat-nav__footer">
        <span>{status}</span>
        <span>
          {visible.length} catégorie{visible.length > 1 ? 's' : ''}
        </span>
      </footer>
    </section>
  );
}
