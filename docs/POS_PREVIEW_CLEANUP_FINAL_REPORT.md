# Rapport final — nettoyage aperçus POS

Date : 2026-06-24

## 1. Anciennes silhouettes détectées

- `components/article-preview.tsx` + `components/article-mockups.tsx` (50+ SVG legacy)
- `lib/data/article-mockup-registry.ts` (131 mappings)
- `public/assets/products/studio/*.svg` (~60 fichiers)
- `public/assets/products/fallbacks/mug-white.svg` (mug générique trompeur)

## 2. Anciennes silhouettes supprimées du flux POS

- `ProductPreviewEngine` **n’importe plus** `ArticlePreview`
- Panier (`cart-item-card.tsx`) migré vers `ProductPreviewEngine`
- Configurateur POS (`pos-summary-content.tsx`) déjà sur `ProductPreviewEngine`
- Registre sans référence `mockup2D` studio par défaut

## 3. Quarantaine

- `public/mockups/_deprecated/mug-white.svg` (copie)
- Doc : `docs/DEPRECATED_POS_MOCKUPS.md`

## 4. Produits impactés

**95/95** produits POS — tous passent par `lib/pos-preview/product-preview.registry.ts`

## 5. Nouvelle classification

9 familles visuelles — voir `docs/POS_PREVIEW_PRODUCT_FAMILIES.md`

## 6. Moteur ProductPreviewEngine

- `ProductPreviewStage` — ratio dynamique
- `FamilyFallbacks` — 9 fallbacks premium SVG
- `MaterialLayer` / `FinishLayer` — finition visuelle
- `ScaleReference` + `DimensionRuler` — échelle grands formats
- `ProductPreview3D` — 3D CSS lazy (roll-up, mug, boîte, oriflamme)
- Badge « Aperçu indicatif »

## 7. Fallbacks créés

`PaperFallback`, `BookletFallback`, `BindingFallback`, `FlexibleLargeFormatFallback`, `RigidPanelFallback`, `VerticalDisplayFallback`, `TextileFallback`, `ObjectFallback`, `GraphicServiceFallback`

## 8. Produits sans mockup réaliste dédié

Majorité — rendu via fallback famille (cohérent, non trompeur). Priorité future 3D : `plv-rollup`, `gd-mug`, `pkg-boite`, `plv-oriflamme`.

## 9. Produits avec mockupKey spécifique

`gd-mug` (mug), `pkg-gobelet` (cup), `gd-gourde` (bottle), `gd-stylo` (pen), `pkg-boite` (box), etc.

## 10. Résultats tests

| Commande | Résultat |
|----------|----------|
| `npm run typecheck` | OK |
| `npm run test -- tests/pos-preview-engine.test.ts` | 6/6 OK |
| `npm run validate:pos-previews` | PASS |
| `npm run build` | EPERM Prisma (verrou fichier local — relancer hors serveur dev) |

## 11. Validation métier

- Prix, panier, devis : non modifiés (changement UI preview uniquement)
- Règle mug : **seul `gd-mug`** utilise silhouette tasse

## 12. Fichiers clés

```
lib/pos-preview/product-preview.registry.ts
lib/pos-preview/product-preview.families.ts
components/pos-preview/ProductPreviewEngine.tsx
components/pos-preview/fallbacks/FamilyFallbacks.tsx
scripts/validate-pos-previews.ts
```
