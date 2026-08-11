'use client';

import { useState, useEffect, Suspense } from 'react';
import { Search, Eye, ShoppingCart, RefreshCw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getFavoriteIds, getRecentArticleIds } from '@/lib/cart-store';
import type { EffectiveArticleState } from '@/lib/admin-config/types';
import { OrionEmptyState, OrionPageHeader } from '@/components/orion';
import { PosCatalogGrid } from '@/components/pos/pos-catalog-grid';
import { posProductHref, appendPosQueryParam } from '@/lib/pos/catalog-nav';
import { CommandeDeepLinkBanner } from '@/components/commandes/commande-deep-link-banner';
import { useCommandeDeepLink } from '@/lib/hooks/use-commande-deep-link';
import { usePosCatalogue } from '@/lib/hooks/use-pos-catalogue';
import { usePosCatalogFilters } from '@/lib/hooks/use-pos-catalog-filters';
import { useSalesClient } from '@/lib/sales-flow/use-sales-client';
import { PosClientGate } from '@/components/sales-flow/pos-client-gate';
import { PosContinueCartBanner } from '@/components/sales-flow/pos-continue-cart-banner';
import { usePosOrderFlow } from '@/components/sales-flow/pos-order-flow-provider';
import { OrionErrorBoundary } from '@/components/shared/orion-error-boundary';
import { PosCategoryNav } from '@/components/pos/pos-category-nav';
import '@/styles/pos-catalog-editorial.css';

function POSPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const commandeQueryId = searchParams.get('commande');
  const { info: commandeLinkInfo } = useCommandeDeepLink();
  const isDraftPreview = searchParams.get('preview') === 'draft';
  const previewRole = searchParams.get('role') ?? 'commercial';
  const { items: catalogueItems, categories, loading: catalogueLoading, apiError, refresh: refreshCatalogue } = usePosCatalogue();
  const { client: salesClient, hydrated, hasClient } = useSalesClient();
  const { openClientSearch, requestClientChange } = usePosOrderFlow();

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [articleStates, setArticleStates] = useState<Record<string, EffectiveArticleState>>({});

  useEffect(() => {
    const qs = isDraftPreview
      ? `?preview=draft&role=${encodeURIComponent(previewRole)}`
      : '';
    fetch(`/api/admin-config/effective${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.articles) setArticleStates(d.articles);
      })
      .catch(() => { console.warn('[pos] fetch secondary failed'); });
  }, [isDraftPreview, previewRole]);

  useEffect(() => {
    setFavoriteIds(getFavoriteIds());
    setRecentIds(getRecentArticleIds());
    const onFav = () => setFavoriteIds(getFavoriteIds());
    const onRecent = () => setRecentIds(getRecentArticleIds());
    window.addEventListener('favoritesUpdated', onFav);
    window.addEventListener('recentsUpdated', onRecent);
    return () => {
      window.removeEventListener('favoritesUpdated', onFav);
      window.removeEventListener('recentsUpdated', onRecent);
    };
  }, []);

  const {
    search,
    setSearch,
    selectedCat,
    setSelectedCat,
    filtered,
    catCounts,
    allCats,
  } = usePosCatalogFilters({
    catalogueItems,
    categories,
    favoriteIds,
    recentIds,
    articleStates,
  });

  useEffect(() => {
    const cat = searchParams.get('cat');
    if (cat === 'favoris' || cat === 'recents' || cat === 'top' || cat === 'tous') {
      setSelectedCat(cat);
    } else if (cat && categories.some((c) => c.id === cat)) {
      setSelectedCat(cat);
    }
  }, [searchParams, categories, setSelectedCat]);

  const shellClass = 'pos-soft-shell pos-catalog-editorial space-y-4 w-full max-w-none';

  return (
    <OrionErrorBoundary zone="POS">
      <div className={shellClass}>
        {isDraftPreview && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-[7px] border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-sm">
            <Eye size={16} />
            <span>
              <strong>Mode preview</strong> — configuration brouillon (rôle simulé : {previewRole}).
            </span>
          </div>
        )}

        <div className="pos-catalog-hero-bar">
          <OrionPageHeader
            className="pos-module-header border-0 mb-0 pb-0"
            compact
            kicker="Catalogue"
            title="Nos articles"
            description="Des supports personnalisés pour tous vos projets."
            meta={
              <>
                <b>{filtered?.length ?? 0}</b> art.
              </>
            }
            actions={
              hasClient && salesClient ? (
                <div className="pos-client-pill">
                  <div className="flex items-center gap-2 px-1.5 sm:border-r border-slate-100 dark:border-white/10">
                    <div className="pos-client-pill__avatar" aria-hidden>
                      {(salesClient.name || 'C')
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((w) => w[0]?.toUpperCase() ?? '')
                        .join('') || 'C'}
                    </div>
                    <div className="hidden sm:block min-w-0">
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate max-w-[10rem] leading-none">
                        {salesClient.name}
                      </div>
                    </div>
                  </div>
                  {requestClientChange ? (
                    <button type="button" className="pos-client-pill__btn" onClick={requestClientChange}>
                      Changer
                    </button>
                  ) : null}
                </div>
              ) : null
            }
          />
        </div>

        {commandeLinkInfo && <CommandeDeepLinkBanner info={commandeLinkInfo} />}
        <PosContinueCartBanner />
        {hydrated && !hasClient && <PosClientGate onStartOrder={openClientSearch} />}

        {hasClient && salesClient && (
          <>
            {apiError ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-[7px] border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                <p className="text-xs text-amber-800 dark:text-amber-300 flex-1">{apiError}</p>
                <button
                  type="button"
                  onClick={() => refreshCatalogue()}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-[7px] border border-amber-500/40 hover:bg-amber-500/15"
                >
                  <RefreshCw size={14} />
                  Réessayer
                </button>
              </div>
            ) : null}

            <PosCategoryNav
              categories={allCats}
              counts={catCounts}
              selectedId={selectedCat}
              onSelect={(id) => {
                if (id === 'conception') {
                  router.push('/pos/conception');
                  return;
                }
                setSelectedCat((prev) => (prev === id && id !== 'tous' ? 'tous' : id));
              }}
            />

            <section className="pos-ed-tools" aria-label="Filtres catalogue">
              <label>
                <span>Rechercher un article</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nom, famille ou description…"
                  aria-label="Rechercher un article"
                />
              </label>
            </section>

            {catalogueLoading && (filtered?.length ?? 0) === 0 ? (
              <section className="pos-ed-section" aria-label="Articles">
                <div className="pos-ed-section__head">
                  <p className="pos-ed-section__kicker">Articles</p>
                  <p className="pos-ed-section__meta">Chargement…</p>
                </div>
              <div className="pos-ed-grid" aria-busy="true" aria-label="Chargement du catalogue">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="pos-ed-card animate-pulse pointer-events-none" aria-hidden>
                    <div className="pos-ed-card__family">
                      <p style={{ width: 80, height: 12, background: '#eef1f5', borderRadius: 4 }} />
                    </div>
                    <div className="pos-ed-card__body space-y-2">
                      <div className="h-4 w-3/4 rounded-[7px] bg-[#eef1f5]" />
                      <div className="h-3 w-full rounded-[7px] bg-[#f3f5f8]" />
                      <div className="h-3 w-5/6 rounded-[7px] bg-[#f3f5f8]" />
                    </div>
                    <div className="pos-ed-card__foot" />
                  </div>
                ))}
              </div>
              </section>
            ) : (filtered?.length ?? 0) > 0 ? (
              <section className="pos-ed-section" aria-label="Articles">
                <div className="pos-ed-section__head">
                  <p className="pos-ed-section__kicker">Articles</p>
                  <p className="pos-ed-section__meta">
                    {filtered?.length ?? 0} produit{(filtered?.length ?? 0) > 1 ? 's' : ''}
                  </p>
                </div>
              <PosCatalogGrid
                items={filtered ?? []}
                articleStates={articleStates}
                onSelect={(item) => {
                  if (item?.category === 'conception' || item?.id?.startsWith('cg-')) {
                    router.push('/pos/conception');
                  } else {
                    router.push(
                      appendPosQueryParam(posProductHref(item?.id ?? '', selectedCat), 'commande', commandeQueryId),
                    );
                  }
                }}
              />
              </section>
            ) : apiError ? (
              <OrionEmptyState
                icon={RefreshCw}
                title="Catalogue indisponible"
                description={apiError}
                action={
                  <button
                    type="button"
                    onClick={() => refreshCatalogue()}
                    className="ans-btn-primary px-4 py-2 text-sm font-semibold rounded-[7px] inline-flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Actualiser le catalogue
                  </button>
                }
              />
            ) : selectedCat === 'favoris' ? (
              <OrionEmptyState
                icon={ShoppingCart}
                title="Aucun favori"
                description="Étoilez un article depuis sa fiche produit pour le retrouver ici."
              />
            ) : selectedCat === 'recents' ? (
              <OrionEmptyState
                icon={Eye}
                title="Aucun article récent"
                description="Les produits consultés apparaîtront ici."
              />
            ) : (
              <OrionEmptyState
                icon={Search}
                title="Aucun article trouvé"
                description="Essayez un autre mot ou une autre famille."
                action={
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-semibold rounded-[7px] border border-[var(--pos-ed-line,#e6e9ef)] bg-white"
                    onClick={() => {
                      setSearch('');
                      setSelectedCat('tous');
                    }}
                  >
                    Réinitialiser
                  </button>
                }
              />
            )}
          </>
        )}
      </div>
    </OrionErrorBoundary>
  );
}

export default function POSPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Chargement catalogue…</div>}>
      <POSPageInner />
    </Suspense>
  );
}
