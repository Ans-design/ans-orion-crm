/** Feature flags POS — aperçus produits désactivés par défaut */
export const POS_FEATURES = {
  /** Aucun mockup / silhouette produit dans le POS tant que les visuels ne sont pas fiables */
  productPreviews: false,
} as const;

export const ENABLE_PRODUCT_PREVIEWS = POS_FEATURES.productPreviews;
