# AUDIT — Catégories POS Catalogue (Finitions & Reliures)

Date : 2026-07-11  
Critère : « Finitions & Reliures » = uniquement finitions / reliures / façonnage.

## Cause racine

`familyToCategoryId()` dans `lib/services/catalogue-service.ts` renvoyait **`finitions` par défaut** dès qu’une famille DB n’était pas dans `CAT_LABELS`.

Les articles vente directe synchronisés avec des familles non canoniques (`Textile`, `Cartes`, `Impression petit format`, `cartes`, `Grand format standard`…) étaient donc affichés dans **Finitions & Reliures** au POS, malgré un libellé métier correct.

Ce n’était pas un bug d’affichage seul : le mapping POS écrasait la catégorie.

## Articles mal classés (exemples) — avant → après

| Article | Ancienne famille DB | Nouvelle catégorie POS |
|---------|---------------------|-------------------------|
| Bob personnalisé (AVD022) | Textile → (POS) finitions | Textiles |
| Casquette personnalisée (AVD021) | Textile → finitions | Textiles |
| T-shirt / Polo / Sweat / Trousse | Textile → finitions | Textiles |
| Carte de visite standard (cv-std) | cartes → finitions | Carterie |
| Carte de fidélité standard (AVD012) | Cartes → finitions | Carterie |
| Carte de visite recto / R-V (AVD013/014) | Cartes → finitions | Carterie |
| Flyers 90x90 recto / R-V (AVD017/018) | Impression petit format → finitions | Flyers |
| Flyers A4 (AVD016) | Impression petit format → finitions | Flyers |
| Roll-up / X-Banner (AVD008/009/011) | Grand format standard → finitions | Grand Format & PVC |

## Ce qui reste dans Finitions & Reliures

- Articles catalogue `fin-*` (pelliculage, reliure, découpe, dorure, coins, couture…)
- Tarifs `FinishingPrice` synchronisés (spirales, pelliculage, plastification, collage, découpe photobooth PVC/Plexi, rainage…)

Compteur local après réparation : **29** articles en `finitions` (0 produit fini textile/carterie/flyer).

## Source corrigée

| Couche | Correction |
|--------|------------|
| Taxonomie | `lib/pos/article-category-taxonomy.ts` — `validateArticleCategory`, `suggestCorrectCategory`, `familyToCategoryId`, alias |
| Builder POS | `lib/services/catalogue-pos-builder.ts` — hint articleId/name |
| Catalogue service | `lib/services/catalogue-service.ts` — plus de fallback finitions ; repair au 1er chargement process |
| Sync DirectSale | `lib/services/direct-sale-pos-sync.service.ts` — family canonique à la sync |
| Repair DB | `lib/services/pos-category-repair.service.ts` + `scripts/repair-pos-categories.ts` |
| Excel Catalogue POS | colonnes ID/ARTICLE/CATÉGORIE/FAMILLE/TYPE/MODE PRIX/VISIBLE POS/STATUT/RÉFÉRENCE/DÉTAIL ; import met à jour `family` |
| Admin | filtres « Catégorie incohérente » / « À vérifier » ; action « Réattribuer catégories » ; anomalies hub Prix |

## Fichiers modifiés

- `lib/pos/article-category-taxonomy.ts` *(nouveau)*
- `lib/services/pos-category-repair.service.ts` *(nouveau)*
- `lib/services/catalogue-service.ts`
- `lib/services/catalogue-pos-builder.ts`
- `lib/services/direct-sale-pos-sync.service.ts`
- `lib/backoffice/catalogue-pos-excel-format.ts`
- `lib/server/modules/catalogue/catalogue-pos-excel-import.service.ts`
- `lib/server/modules/backoffice-v2/admin-backoffice-chips.service.ts`
- `lib/server/modules/backoffice-v2/admin-backoffice-chips.types.ts`
- `app/api/admin-backoffice/catalogue-pos/import-excel/route.ts`
- `components/administration/catalogue/CatalogueArticleNavigator.tsx`
- `components/administration/catalogue/CatalogueActionsMenu.tsx`
- `components/administration/prix-matieres-stock/PrixMatieresStockWorkspace.tsx`
- `scripts/seed-direct-sale-examples.mjs`
- `scripts/repair-pos-categories.ts`
- `tests/pos-category-taxonomy.test.ts`

## Anomalies restantes

- Certains IDs profil issus de `FinishingPrice` restent techniques (`6 mm / 1/4″`, `A4`, `m2`) — catégorie correcte (finitions), IDs à normaliser plus tard si besoin.
- « Personnalisation libre » (`fin-autres`) reste en finitions (opération libre / façonnage).
- Tote bag (AVD025) classé Textiles (textile) plutôt que Goodies — conforme à la règle « tote bag textile ».

## Tests

| # | Scénario | Résultat |
|---|----------|----------|
| 1 | Aucun textile dans Finitions | OK |
| 2 | Bob → Textiles | OK |
| 3 | Casquette → Textiles | OK |
| 4 | Carte de visite → Carterie | OK |
| 5 | Carte de fidélité → Carterie | OK |
| 6 | Flyers 90x90 → Flyers | OK |
| 7 | Collage / Découpe / Dorure / Couture / Coins restent finitions | OK |
| 8 | Excel catégorie importable | OK (code) — à rejouer manuellement en UI |
| 9 | Persistance après repair / F5 | OK (DB `family` mise à jour) |
| 10 | Compteurs recalculés | OK (finitions 29 ; textile 19 ; carterie 6 ; flyers 4) |

Vitest : `tests/pos-category-taxonomy.test.ts` — 6/6 OK.

## Critère final

**Validé** : Finitions & Reliures ne contient plus Bob, Casquette, cartes, flyers ni autres produits finis ; les familles DB sont canoniques ; le mapping POS ne retombe plus sur `finitions` par défaut.
