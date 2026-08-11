'use client';

import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import type { CatalogueItem, Category } from '@/lib/data/catalogue';
import { CAT_LABELS } from '@/lib/data/catalogue';
import type { ProductConfig } from '@/lib/data/config-types';
import { PosIcon } from '@/lib/pos/pos-icons';

type Props = {
  article: CatalogueItem;
  catDef?: Category;
  productConfig?: ProductConfig | null;
  /** Lien retour catalogue */
  backSlot?: ReactNode;
  /** Slot politique tarifaire */
  policySlot?: ReactNode;
  /** Slot client */
  clientSlot?: ReactNode;
};

/** En-tête POS — 3 zones : produit | prix | client (+ retour) */
export function ProductConfiguratorHeader({
  article,
  catDef,
  productConfig,
  backSlot,
  policySlot,
  clientSlot,
}: Props) {
  const color = catDef?.color ?? '#FF174D';

  return (
    <header
      className={`pos-config-topbar${policySlot ? ' pos-config-topbar--with-policy' : ''}`}
      style={{ ['--pos-cat' as string]: color }}
    >
      {backSlot ? <div className="pos-config-topbar__back">{backSlot}</div> : null}

      <div className="pos-config-topbar__inner">
        <div className="pos-product-hero min-w-0">
          <div className="pos-product-hero__icon" aria-hidden>
            <PosIcon
              category={article.category}
              icon={article.icon}
              size={22}
              className="text-[var(--pos-brand,#FF174D)]"
            />
          </div>
          <div className="pos-product-hero__copy min-w-0">
            <div className="pos-product-hero__meta-row">
              <span className="pos-product-hero__badge">
                {CAT_LABELS[article.category ?? ''] ?? article.category}
              </span>
            </div>
            <h1 className="pos-product-hero__title">{article.name}</h1>
            {article.description ? (
              <p className="pos-product-hero__desc">{article.description}</p>
            ) : null}
            {productConfig?.posBanner ? (
              <p className="pos-product-hero__banner">
                <Info size={11} className="shrink-0" aria-hidden />
                {productConfig.posBanner}
              </p>
            ) : null}
          </div>
        </div>

        <div className="pos-config-topbar__aside">
          {policySlot ? (
            <div className="pos-config-topbar__policy">{policySlot}</div>
          ) : null}
          {clientSlot ? (
            <div className="pos-config-topbar__client">{clientSlot}</div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
