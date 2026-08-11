'use client';

import { useEffect, useState } from 'react';
import type { CatalogueItem } from '@/lib/data/catalogue';
import { CAT_LABELS } from '@/lib/data/catalogue';
import { formatPrice } from '@/lib/format/french-typography';
import type { EffectiveArticleState } from '@/lib/admin-config/types';
import { uxToast } from '@/lib/ux/feedback';
import { posFamilyAccent } from '@/lib/pos/pos-family-accents';
import '@/styles/pos-catalog-editorial.css';

const PAGE_SIZE = 12;

export type PosCatalogStyle = 'editorial' | 'compact' | 'soft';

type Props = {
  items: CatalogueItem[];
  articleStates: Record<string, EffectiveArticleState>;
  onSelect: (item: CatalogueItem) => void;
};

export function PosCatalogGrid({ items, articleStates, onSelect }: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [items]);

  const visible = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return (
    <>
      <div className="pos-ed-grid">
        {visible.map((item) => {
          const artState = articleStates[item?.id ?? ''];
          const isGreyed = artState?.greyed;
          const posItem = item as typeof item & {
            priceConfigured?: boolean;
            priceMissingReason?: string | null;
            priceMode?: string;
          };
          const priceMissing = posItem.priceConfigured === false;
          // Sur devis uniquement si devis forcé OU aucun prix d’entrée
          const isQuoteMode =
            posItem.priceMode === 'quote_required'
            || (item?.prixDepart == null && posItem.priceMode !== 'calculated' && posItem.priceMode !== 'direct');
          const catId = item?.category ?? '';
          const catLabel = CAT_LABELS[catId] ?? catId ?? 'Article';
          const familyColor = posFamilyAccent(catId);

          const open = () => {
            if (artState && !artState.selectable) {
              uxToast.error(isGreyed ? 'Article temporairement indisponible' : 'Accès réservé');
              return;
            }
            if (priceMissing) {
              uxToast.info(
                posItem.priceMissingReason ??
                  'Configuration possible — prix final à valider en Administration',
              );
            }
            onSelect(item);
          };

          const priceLabel = (() => {
            if (priceMissing) {
              return { eyebrow: 'Admin', value: 'À configurer', unit: '' };
            }
            if (posItem.priceMode === 'quote_required') {
              return { eyebrow: 'Sur devis', value: 'Devis', unit: '' };
            }
            if (item?.prixDepart != null && item.prixDepart > 0) {
              const isFlyer = /^fly-/i.test(String(item?.id ?? '')) || item?.category === 'flyers';
              return {
                eyebrow: isFlyer ? 'Réf. A4 · à partir de' : 'À partir de',
                value: formatPrice(item.prixDepart),
                unit: item?.unit ? ` / ${item.unit}` : '',
              };
            }
            if (isQuoteMode) {
              return { eyebrow: 'Sur devis', value: 'Configurer', unit: '' };
            }
            return { eyebrow: 'Tarif', value: 'Configurer', unit: '' };
          })();

          return (
            <button
              key={item?.id}
              type="button"
              className={`pos-ed-card${isGreyed ? ' is-disabled' : ''}`}
              style={{ ['--accent' as string]: familyColor }}
              data-family={catId}
              onClick={open}
              disabled={Boolean(artState && !artState.selectable)}
              title={item?.description || item?.name}
            >
              <div className="pos-ed-card__family">
                <p style={{ color: familyColor }}>{catLabel}</p>
                {item?.popular ? <small>Populaire</small> : null}
              </div>
              <div className="pos-ed-card__body">
                <span className="pos-ed-card__title">{item?.name}</span>
                <span className="pos-ed-card__desc">
                  {item?.description || 'Support personnalisable selon votre projet.'}
                </span>
              </div>
              <div className="pos-ed-card__foot">
                <div className="pos-ed-card__price">
                  <small>{priceLabel.eyebrow}</small>
                  <span className="pos-ed-card__price-value">
                    {priceLabel.value}
                    {priceLabel.unit ? <span>{priceLabel.unit}</span> : null}
                  </span>
                </div>
                <span className="pos-ed-card__cta">Configurer</span>
              </div>
            </button>
          );
        })}
      </div>

      {hasMore ? (
        <div className="pos-ed-more">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, items.length))}
          >
            Afficher plus ({visibleCount}/{items.length})
          </button>
        </div>
      ) : null}
    </>
  );
}
