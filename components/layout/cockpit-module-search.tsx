'use client';

import { Search, X } from 'lucide-react';
import { useModuleListSearch } from '@/components/layout/module-list-search-context';

function openCommandPalette() {
  if (typeof window !== 'undefined') {
    (window as Window & { __orionCmdPalettePending?: boolean }).__orionCmdPalettePending = true;
  }
  window.dispatchEvent(new Event('openCommandPalette'));
}

/** Recherche header = filtre liste du module (évite le double champ page). */
export function CockpitModuleSearch() {
  const { active, query, placeholder, setQuery } = useModuleListSearch();

  if (!active) {
    return (
      <>
        <button
          type="button"
          onClick={openCommandPalette}
          className="orion-cockpit-search hidden md:inline-flex"
          aria-label="Rechercher dans ORION"
        >
          <Search size={14} className="shrink-0 opacity-60" aria-hidden />
          <span className="truncate">Rechercher…</span>
          <kbd className="orion-cockpit-search__kbd hidden xl:inline">⌘K</kbd>
        </button>
        <button
          type="button"
          onClick={openCommandPalette}
          className="orion-header-icon-btn md:hidden"
          aria-label="Rechercher"
        >
          <Search size={17} strokeWidth={2} />
        </button>
      </>
    );
  }

  return (
    <label className="orion-cockpit-search orion-cockpit-search--field inline-flex">
      <Search size={14} className="shrink-0 opacity-60" aria-hidden />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="orion-cockpit-search__input"
      />
      {query ? (
        <button
          type="button"
          className="orion-cockpit-search__clear"
          onClick={() => setQuery('')}
          aria-label="Effacer la recherche"
        >
          <X size={13} strokeWidth={2.25} />
        </button>
      ) : null}
      <button
        type="button"
        className="orion-cockpit-search__kbd hidden xl:inline-flex"
        onClick={(e) => {
          e.preventDefault();
          openCommandPalette();
        }}
        title="Palette de commandes"
        aria-label="Ouvrir la palette ⌘K"
      >
        ⌘K
      </button>
    </label>
  );
}
