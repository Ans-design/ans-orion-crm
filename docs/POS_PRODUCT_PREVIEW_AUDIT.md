# Audit — Aperçus produits POS ANS ORION

Date : 2025-06-24  
Périmètre : module POS / catalogue / configurateur

## 1. Composants actuels (avant refonte)

| Composant | Rôle |
|-----------|------|
| `components/article-preview.tsx` | Point d'entrée aperçu — résolution mockup + rendu SVG |
| `components/article-mockups.tsx` | 50+ silhouettes SVG React inline |
| `components/mockup-studio.tsx` | Dégradés, ombres, matériaux SVG partagés |
| `components/pos/studio-product-preview.tsx` | Cadre studio e-commerce + fallback image `/public/assets/products/studio/` |
| `components/pos/pos-summary-content.tsx` | Récap configurateur — section « Aperçu produit » |
| `components/panier/cart-item-card.tsx` | Aperçu compact panier |
| `components/pos/pos-catalog-grid.tsx` | **Sans visuel** (texte + icône uniquement) |

### Résolution & données

| Fichier | Rôle |
|---------|------|
| `lib/data/product-preview-resolver.ts` | Priorité admin → registry → asset studio → fallback catégorie → SVG |
| `lib/data/article-mockup-registry.ts` | 131 entrées mockup (legacy + POS) |
| `lib/data/article-silhouette.ts` | Dimensions mm, orientation, ratio CSS |
| `lib/data/preview-product-color.ts` | Couleur support depuis config |
| `lib/data/preview-studio-assets.ts` | Mapping kind → SVG studio |
| `lib/data/catalogue.ts` | Source statique ~97 articles |
| `lib/data/catalogue-meta.ts` | **95 articles POS visibles** |

## 2. Les 95 produits POS

Liste complète via `POS_CATALOGUE` (`lib/data/catalogue-meta.ts`) — test `tests/pos-catalogue-count.test.ts`.

Articles masqués : `imp-conception`, `cal-sousmain`.

## 3. Produits partageant le même visuel (mockup kind)

| Mockup kind | Nb produits POS | Exemples |
|-------------|-----------------|----------|
| `flyer` | 14+ | finitions (pelliculage, vernis…), marque-page, impression |
| `flat` | 8+ | formats génériques fallback |
| `book` | 2 | livres, reliure |
| `rigid_panel` | 4 | PVC, plexi, acrylic |
| `vinyl_sheet` | 4 | vinyles GF |
| `textile-garment-2d` | 11 | toute la catégorie textile |
| `display` | 4 | PLV présentoirs |

**Problème** : les finitions utilisaient le mockup `flyer` — visuellement identiques entre elles.

## 4. Produits sans mockup spécifique au niveau article

Tous les 95 ont une entrée dans `ARTICLE_MOCKUP_REGISTRY` ou un fallback par catégorie.  
En revanche, **~14 finitions** partageaient la même silhouette `flyer`.

## 5–10. Classification par format

| Segment | Produits (exemples) | Mockup kind principal |
|---------|---------------------|------------------------|
| Grand format | gf-vinyl-*, gf-bache, gf-pvc… | vinyl_sheet, mesh_banner, rigid_panel |
| Petit format | fly-std, cv-*, ph-tirage, doc-* | flyer, card, photo_print |
| Livret / publication | bk-livres, cal-*, bn-bloc-note | book, notebook, calendar |
| Reliure | fin-* | book / flyer / sticker selon finition |
| Textile | tx-* | tshirt, polo, sweat… |
| Signalétique / PLV | plv-* | rollup, xbanner, flag, display |
| Objets | gd-*, pkg-* | mug, pen, box, pouch |
| Services | cg-hub | conception |

## 11–14. Problèmes constatés

| Problème | Détail |
|----------|--------|
| Alignement | Cadre studio fixe — ratio produit parfois petit dans le cadre |
| Proportions | Dimensions custom GF parfois mal interprétées (cm vs mm) |
| Orientation | Paysage via config OK mais peu visible dans l'UI |
| Performance | Acceptable — pas de Canvas/WebGL massif |
| UX | Pas d'échelle humaine, pas de règle, matière/finition peu visibles |
| Grille catalogue | Aucun aperçu produit |

## 15. Nouvelle architecture (refonte)

Voir `docs/POS_PREVIEW_REFACTOR_FINAL.md`.

```
components/pos-preview/     → ProductPreviewEngine (+ badges, échelle, 3D lazy)
lib/pos-preview/            → registry 95 produits, ratio, matière
public/mockups/             → assets futurs 2D/3D/textures
```

**Intégration** : `pos-summary-content.tsx` utilise désormais `ProductPreviewEngine` qui encapsule `ArticlePreview` (rétrocompatibilité panier / prix / règles métier).
