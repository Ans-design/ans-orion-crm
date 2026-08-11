# Refonte aperçus produits POS — Rapport final

## 1. Problème initial

- Aperçus trop plats et répétitifs (même rectangle / même flyer pour finitions)
- Peu de différenciation entre 95 produits
- Pas d'échelle réelle, pas de règle dimensions, matière/finition peu visibles
- Grille catalogue sans thumbnail
- Pas de stratégie 3D progressive

## 2. Architecture créée

```
components/pos-preview/
  ProductPreviewEngine.tsx    ← moteur central (configurateur)
  ProductPreviewCard.tsx      ← carte compacte (grille future)
  ProductPreviewCanvas.tsx    ← lazy 3D wrapper
  ProductPreview3D.tsx        ← pseudo-3D CSS (roll-up, mug, boîte)
  ProductPreviewFallback.tsx
  ScaleReference.tsx          ← silhouette 1,75 m
  DimensionRuler.tsx          ← règles + surface m²
  MaterialBadge.tsx / FinishBadge.tsx

lib/pos-preview/
  product-preview.registry.ts ← 95 entrées auto-générées
  product-preview-mapper.ts   ← resolvePreviewContext()
  product-preview.rules.ts
  ratio-utils.ts
  material-preview.rules.ts
  mockup-assets.ts
  preview-types.ts

public/mockups/{2d,3d,textures,shadows,placeholders}/
```

## 3. Registre 95 produits

- **100 % couverture** — test `tests/pos-preview-engine.test.ts`
- Chaque produit : famille, previewType, mockupKind, scaleReference, materialStyle

## 4. Familles visuelles

11 familles — voir `docs/POS_PRODUCT_PREVIEW_CLASSIFICATION.md`

## 5. Mockups 2D

Réutilisation de la bibliothèque existante (`article-mockups.tsx` + assets studio SVG) — **aucune régression**.

Enrichissement UX :
- Ombres paramétriques (`getPreviewShadowStyle`)
- Classes perspective CSS (`.pos-preview-perspective`)
- Overlays finition (brillant, pelliculage)

## 6. Mockups 3D

**Stratégie progressive** (sans installer Three.js) :

| Tier | Technologie | Usage |
|------|-------------|-------|
| 1 | CSS/SVG | Grille + configurateur (défaut) |
| 2 | Canvas 2D | Prévu upload client (future) |
| 3 | pseudo-3D CSS | Mode « 3D » roll-up, mug, boîte |
| 4 | GLB / model-viewer | Optionnel — dossier `public/mockups/3d/` prêt |

## 7. Produits 3D interactive (mode advanced)

- `plv-rollup`, `plv-xbanner`, `gd-mug`, `pkg-boite`
- Toggle **2D / 3D** dans le configurateur

## 8. Produits pseudo-3D

Tous les `previewType` contenant `pseudo3d` : vinyle, bâche, livret, roll-up, drapeau, panneau, boîte…

## 9. Fallbacks

- Asset studio manquant → SVG React (`ArticlePreview`)
- 3D indisponible → fallback 2D premium
- Champs dimensions manquants → aperçu partiel + message

## 10. Tests réalisés

- `npm run typecheck` ✅
- `tests/pos-preview-engine.test.ts` ✅ (registry 95, ratio, context GF)
- `tests/pos-catalogue-count.test.ts` ✅

## 11. Performance

- Pas de Three.js dans le bundle
- 3D lazy via `dynamic()` + `Suspense`
- Grille POS : tier CSS uniquement (`PREVIEW_RULES.gridUses2DOnly`)
- Panier : continue d'utiliser `ArticlePreview` compact (inchangé)

## 12. Intégration POS

- `pos-summary-content.tsx` → `ProductPreviewEngine`
- Panier, prix, synthèse, validation : **inchangés**
- `ArticlePreview` conservé comme moteur SVG interne

## 13. Recommandations futures

1. Thumbnails dans `PosCatalogGrid` via `ProductPreviewCard`
2. GLB optimisés (<500 KB) pour roll-up / mug dans `public/mockups/3d/`
3. `@react-three/fiber` optionnel — uniquement page détail si métriques bundle OK
4. Texture mapping upload client (Canvas 2D)
5. Export aperçu dans devis PDF / commande

## 14. Fichiers documentation

- `docs/POS_PRODUCT_PREVIEW_AUDIT.md`
- `docs/POS_PRODUCT_PREVIEW_CLASSIFICATION.md`
- `docs/POS_PREVIEW_95_PRODUCTS_REPORT.md` (tableau auto-généré)
- `docs/POS_PREVIEW_REFACTOR_FINAL.md` (ce fichier)
