# Rapport — suppression aperçus produits POS

Date : 2026-06-24

## Décision

Les aperçus visuels produit (mockups, silhouettes, pseudo-3D) sont **désactivés** dans tout le POS.  
Feature flag : `lib/pos/features.ts` → `ENABLE_PRODUCT_PREVIEWS = false`

## Composants retirés de l’UI POS

| Emplacement | Avant | Après |
|-------------|-------|-------|
| Configurateur (`pos-summary-content.tsx`) | Bloc « Aperçu produit » + `ProductPreviewEngine` | `PosConfigurationSummary` (texte) |
| Panier (`cart-item-card.tsx`) | Colonne preview `ProductPreviewEngine` | Grille specs texte uniquement |
| Catalogue grille | Pas de preview (inchangé) | Inchangé |

## Nouveaux composants

- `components/pos/pos-missing-fields-banner.tsx` — liste des champs manquants + liens scroll
- `components/pos/pos-configuration-summary.tsx` — synthèse produit / format / prix
- `lib/pos/features.ts` — flag global

## Composants dépréciés (conservés, non rendus)

Tant que `ENABLE_PRODUCT_PREVIEWS === false`, ces fichiers **ne s’affichent pas** :

- `components/pos-preview/ProductPreviewEngine.tsx` → retourne `null`
- `components/pos-preview/*` (fallbacks, stage, 3D, rulers…)
- `components/article-preview.tsx` — toujours présent (admin / legacy), hors flux POS
- `lib/pos-preview/*` — registre conservé pour réactivation future

## Données métier conservées

Articles, prix, panier, devis, commandes, stock, règles — **aucune modification**.

## Réactivation future

Dans `lib/pos/features.ts` :

```ts
export const POS_FEATURES = {
  productPreviews: true, // uniquement quand mockups fiables
};
```

## Tests

- `npm run typecheck`
- `npm run test -- tests/pos-preview-engine.test.ts` (registre inchangé)
- Vérification visuelle : configurateur, panier — aucun bloc aperçu

## Critères validation

- [x] Aucun « Aperçu produit » visible configurateur
- [x] Aucune silhouette / mug / mockup dans panier
- [x] Synthèse de configuration affichée
- [x] Champs manquants listés avec action scroll
- [x] Tarification intacte
