'use client';

import type { ArticleAdminEntry, ProductPreviewAdminEntry } from '@/lib/admin-config/types';
import { getProductPreviewConfig, CATEGORY_PREVIEW_FALLBACKS } from '@/lib/data/product-preview-config';

type Props = {
  articles: ArticleAdminEntry[];
  productPreviews: Record<string, ProductPreviewAdminEntry> | undefined;
  canEdit: boolean;
  onSetPreviewField: (articleId: string, patch: Partial<ProductPreviewAdminEntry>) => void;
};

export function AdminControlApercusTab({
  articles,
  productPreviews,
  canEdit,
  onSetPreviewField,
}: Props) {
  return (
    <section className="pta-data-section" aria-label="Aperçus POS par article">
      <p className="pta-data-hint">
        Affectez un asset catalogue (<code className="orion-text-code">/assets/products/…</code>) ou un fallback catégorie.
        Les mockups SVG restent actifs par défaut. Les prix POS « À partir de » viennent de la DB / moteurs publiés
        — pas du catalogue TypeScript (aperçu local aligné Lot 5).
      </p>
      <div className="pta-data-scroll">
        <table className="pta-admin-table">
          <thead>
            <tr>
              <th>Article</th>
              <th>Type auto</th>
              <th>Asset principal</th>
              <th>Fallback catégorie</th>
              {canEdit && <th>Actif</th>}
            </tr>
          </thead>
          <tbody>
            {articles.map((art) => {
              const auto = getProductPreviewConfig(art.id);
              const override = productPreviews?.[art.id];
              const catFallback = CATEGORY_PREVIEW_FALLBACKS[art.category] ?? '—';
              return (
                <tr key={art.id}>
                  <td>
                    <div className="font-semibold">{art.name}</div>
                    <div className="text-muted-foreground orion-text-code">{art.id}</div>
                  </td>
                  <td className="orion-text-code">{auto?.previewType ?? '—'}</td>
                  <td>
                    {canEdit ? (
                      <input
                        value={override?.assetPath ?? ''}
                        onChange={(e) => onSetPreviewField(art.id, { assetPath: e.target.value || null })}
                        placeholder="/assets/products/…"
                        className="pta-cell-input"
                      />
                    ) : (
                      <span className="orion-text-code">{override?.assetPath ?? '—'}</span>
                    )}
                  </td>
                  <td>
                    {canEdit ? (
                      <input
                        value={override?.categoryFallbackAsset ?? catFallback}
                        onChange={(e) => onSetPreviewField(art.id, { categoryFallbackAsset: e.target.value || null })}
                        className="pta-cell-input"
                      />
                    ) : (
                      <span className="orion-text-code">{override?.categoryFallbackAsset ?? catFallback}</span>
                    )}
                  </td>
                  {canEdit && (
                    <td>
                      <input
                        type="checkbox"
                        checked={override?.isActive !== false}
                        onChange={(e) => onSetPreviewField(art.id, { isActive: e.target.checked })}
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
