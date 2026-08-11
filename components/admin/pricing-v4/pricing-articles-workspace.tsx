'use client';

import '@/components/admin/pricing-v4/pricing-admin.css';
import { ArticleCatalogPage } from './catalog/article-catalog-page';

type Props = {
  canEdit: boolean;
  initialArticleId?: string | null;
  /** Incrémenté depuis le header Admin pour ouvrir le CRUD création. */
  createToken?: number;
  /** Masque Exporter / Nouvel article du toolbar (actions portées par le header). */
  hidePrimaryActions?: boolean;
};

/** Workspace articles — liste lisible + fiche produit (CSS orion-pricing-admin requis hors backoffice). */
export function PricingArticlesWorkspace(props: Props) {
  return (
    <div className="orion-pricing-admin cps-pricing-articles-embed min-h-[480px] w-full">
      <ArticleCatalogPage {...props} />
    </div>
  );
}
