'use client';

import { useMemo, useState } from 'react';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { POS_HIDDEN_ARTICLE_IDS } from '@/lib/data/catalogue-meta';
import { bacheSearchMatches } from '@/lib/pos/bache-catalog';
import {
  isRedundantGrandFormatPosCard,
  isPvcPetitFormatArticle,
  isPlvFinishedProduct,
} from '@/lib/pos/grand-format-redundant';
import { isRedundantDirectSalePosSku } from '@/lib/pos/direct-sale-pos-redundant';
import { isRedundantPersonalizedArticle } from '@/lib/pos/personalized-article-redundant';
import { isRedundantFinitionVariantCard } from '@/lib/pos/finition-variant-redundant';
import type { CatalogueItem, Category } from '@/lib/data/catalogue';
import type { EffectiveArticleState } from '@/lib/admin-config/types';

type Args = {
  catalogueItems: CatalogueItem[];
  categories: Category[];
  favoriteIds: string[];
  recentIds: string[];
  articleStates: Record<string, EffectiveArticleState>;
  initialCategory?: string;
};

export function usePosCatalogFilters({
  catalogueItems,
  categories,
  favoriteIds,
  recentIds,
  articleStates,
  initialCategory = 'tous',
}: Args) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);
  const [selectedCat, setSelectedCat] = useState(initialCategory);
  const [sortBy, setSortBy] = useState('name');

  const filtered = useMemo(() => {
    let items = [...catalogueItems].filter((i) => {
      const id = i?.id ?? '';
      const name = i?.name ?? '';
      if (POS_HIDDEN_ARTICLE_IDS.has(id)) return false;
      if (isRedundantGrandFormatPosCard(name, id)) return false;
      if (isRedundantFinitionVariantCard(name, id)) return false;
      if (isRedundantDirectSalePosSku(name, id)) return false;
      if (isRedundantPersonalizedArticle(name, id)) return false;
      // Filet Grand Format : matières uniquement
      if (i?.category === 'grand_format') {
        if (isPvcPetitFormatArticle(name, id)) return false;
        if (isPlvFinishedProduct(name, id) && !/^gf-/i.test(id)) return false;
        if (/roll[\s-]?up|x[\s-]?banner|b[aâ]che\s+.+\d|palier/i.test(name) && id !== 'gf-bache') {
          return false;
        }
      }
      return true;
    });
    if (selectedCat === 'favoris') {
      items = items.filter((i) => favoriteIds.includes(i?.id ?? ''));
    } else if (selectedCat === 'recents') {
      const order = new Map(recentIds.map((id, i) => [id, i]));
      items = items
        .filter((i) => order.has(i?.id ?? ''))
        .sort((a, b) => (order.get(a?.id ?? '') ?? 99) - (order.get(b?.id ?? '') ?? 99));
    } else if (selectedCat === 'top') {
      items = items.filter((i) => i?.popular);
    } else if (selectedCat !== 'tous') {
      items = items.filter((i) => i?.category === selectedCat);
    }
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      items = items.filter((i) =>
        (i?.name ?? '').toLowerCase().includes(q) ||
        (i?.description ?? '').toLowerCase().includes(q) ||
        (i?.category ?? '').toLowerCase().includes(q) ||
        bacheSearchMatches(i?.id ?? '', i?.name ?? '', i?.description ?? '', q),
      );
    }
    items = items.filter((i) => {
      const st = articleStates[i?.id ?? ''];
      if (!st) return true;
      return st.visibility !== 'HIDDEN';
    });
    items.sort((a, b) => {
      if (sortBy === 'name') return (a?.name ?? '').localeCompare(b?.name ?? '');
      if (sortBy === 'prix') return (a?.prixDepart ?? 999999) - (b?.prixDepart ?? 999999);
      if (sortBy === 'popular') return (b?.popular ? 1 : 0) - (a?.popular ? 1 : 0);
      return 0;
    });
    return items;
  }, [debouncedSearch, selectedCat, sortBy, favoriteIds, recentIds, articleStates, catalogueItems]);

  const catCounts = useMemo(() => {
    const visible = catalogueItems.filter((i) => {
      const st = articleStates[i?.id ?? ''];
      if (!st) return true;
      return st.visibility !== 'HIDDEN';
    });
    const counts: Record<string, number> = {
      tous: visible.length,
      favoris: favoriteIds.filter((id) => !POS_HIDDEN_ARTICLE_IDS.has(id)).length,
      recents: recentIds.filter((id) => !POS_HIDDEN_ARTICLE_IDS.has(id)).length,
      top: visible.filter((i) => i?.popular).length,
    };
    visible.forEach((i) => {
      counts[i?.category ?? ''] = (counts[i?.category ?? ''] ?? 0) + 1;
    });
    return counts;
  }, [favoriteIds, recentIds, articleStates, catalogueItems]);

  const allCats = useMemo(() => [
    { id: 'tous', label: 'Toute la collection', short: 'Tous', icon: 'tous', color: '#155EEF' },
    { id: 'favoris', label: 'Vos favoris', short: 'Favoris', icon: 'favoris', color: '#D444F1' },
    { id: 'recents', label: 'Récemment consultés', short: 'Récents', icon: 'recents', color: '#7A5AF8' },
    { id: 'top', label: 'Les incontournables', short: 'Top', icon: 'top', color: '#0086C9' },
    ...categories.map((c: Category) => ({
      id: c.id,
      label: c.label,
      short: c.label.split(' ')[0].slice(0, 12),
      icon: c.id,
      color: c.color,
    })),
  ], [categories]);

  return {
    search,
    setSearch,
    selectedCat,
    setSelectedCat,
    sortBy,
    setSortBy,
    filtered,
    catCounts,
    allCats,
  };
}
