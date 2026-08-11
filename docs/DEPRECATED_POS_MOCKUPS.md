# Mockups POS dépréciés

Assets déplacés ou retirés du flux POS (`ProductPreviewEngine`). Ne plus les référencer dans le registre central.

| Fichier | Ancien usage | Problème | Action | Nouveau rendu |
|---------|--------------|----------|--------|---------------|
| `mug-white.svg` | Fallback générique plusieurs articles | Mug affiché sur produits non-mug | Copié en quarantaine, retiré du mapping POS | Fallback par famille (`ObjectFallback` / `PaperFallback`…) |
| `/assets/products/studio/*.svg` | Silhouettes legacy via `ArticlePreview` | Visuels incohérents (mug, livret, A4 générique) | Bypassés dans POS — `forbiddenAssets` registre | Fallback SVG paramétrique par famille |
| `article-mockups.tsx` | 50+ composants SVG hardcodés | Mappings incorrects catégorie → silhouette | Non utilisé par `ProductPreviewEngine` | Registre `product-preview.registry.ts` |
| `preview-studio-assets.ts` | Assets studio par `MockupKind` | Même silhouette pour familles différentes | Hors chemin POS preview | `fallbackComponent` + pseudo-3D |

## Quarantaine

- `public/mockups/_deprecated/mug-white.svg` — copie de référence (original conservé hors POS)

## Statut

- **Supprimé du mapping POS** : mug-white, studio SVG en entrée directe configurateur/panier
- **Remplacé** : 95 produits → fallbacks famille premium
- **À refaire** : mockups 2D/3D réalistes par produit prioritaire (roll-up, mug, vinyle, bâche, livret)

## Règle

Mieux vaut un fallback neutre cohérent qu’un mockup faux. Seul `gd-mug` utilise `mockupKey: mug`.
