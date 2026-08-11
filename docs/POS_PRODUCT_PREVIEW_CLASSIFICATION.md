# Classification visuelle — 95 produits POS

## Familles visuelles

| Famille | Code registry | Produits | Rendu principal |
|---------|---------------|----------|-----------------|
| Petits formats imprimés | `petits-formats` | 12 | flat-paper-2d, card-stack-2d |
| Livres & publications | `livres-publications` | 8 | book-pseudo3d, notebook-pseudo3d |
| Reliure & façonnage | `reliure-faconnage` | 13 | book / vinyl / card selon finition |
| Grand format plat | `grand-format-plat` | 14 | vinyl-sheet, mesh-banner, rigid-panel |
| Supports debout | `supports-debout` | 8 | roll-up, x-banner, flag, display |
| Textile | `textile` | 11 | textile-garment-2d |
| Objets personnalisés | `objets-personnalises` | 11 | mug, pen, generic |
| Packaging | `objets-packaging` | 6 | box, pouch, packaging |
| Événementiel | `signaletique-evenementiel` | 13 | poster, flag, photocall, ticket |
| Services graphiques | `services-graphiques` | 1 | service-concept |
| Impression sans finition | `petits-formats` | 1 | flat-paper-2d |

## Règles par famille

### Petits formats
- Ratio ISO (A6→A3) ou custom
- Orientation portrait/paysage/carré
- Échelle : carte bancaire / main (future)

### Grand format
- Ratio custom obligatoire (largeur × hauteur)
- **scaleReference: true** — silhouette 1,75 m
- Règle graduée + surface m²
- Matière : vinyle, bâche, PVC, acrylique

### Supports debout
- Ratio vertical dominant
- pseudo-3D roll-up / X-banner
- Mode advanced : pseudo-3D CSS (Three.js optionnel futur)

### Textile
- Silhouette vêtement par type (tshirt, polo, cap…)
- Texture tissu via `materialStyle: fabric`

### Reliure & finitions
- Variantes visuelles via `FinishBadge` + overlay CSS
- Spirale, agrafé, pelliculage reflétés dans `material-preview.rules.ts`

## Mapping technique

Registre : `lib/pos-preview/product-preview.registry.ts`  
Généré depuis `POS_CATALOGUE` + `ARTICLE_MOCKUP_REGISTRY` + overrides produit.

Chaque entrée contient :
- `productId`, `productSlug`, `family`, `previewType`
- `mockupKind` (lien vers SVG existant)
- `renderTier` : `css-svg` (défaut) | `three-lite` (advanced)
- `scaleReference`, `materialStyle`, `finishStyles`, `fallbackIcon`

## Produits prioritaires 3D interactive (mode advanced)

| Produit | previewType | Tier advanced |
|---------|-------------|---------------|
| plv-rollup | roll-up-pseudo3d | three-lite (CSS pseudo-3D) |
| plv-xbanner | x-banner-pseudo3d | three-lite |
| gd-mug | mug-pseudo3d | three-lite |
| pkg-boite | box-pseudo3d | three-lite |
| plv-oriflamme | flag-curved-pseudo3d | css-svg |

> Three.js / GLB : prévu via `ProductPreviewCanvas` lazy — non installé pour éviter lourdeur bundle. Migration possible article par article.
