# AUDIT — Catégories Grand Format & PVC (POS)

Date : 2026-07-11 (mise à jour stricte)  
Critère : Grand Format & PVC = supports/matières au m²/ml/plaque uniquement.

## Cause racine

1. **Sync `GrandFormatPricing` → POS** créait une carte par ligne tarif (formats A4/A3/A2, paliers, Roll-up, X-Banner, PVC opaque…).
2. **DirectSale** Roll-up / X-Banner avaient `category = Grand Format` + `visiblePOS = true`.
3. **Admin filtre** `family.includes('grand')` pouvait lister des profils archivés / mal classés.
4. **Admin Grand Format prix** listait encore les lignes archivées (formats/paliers).

## Compteurs POS (builder, local)

| Catégorie | Avant (pollué) | Après |
|-----------|----------------|-------|
| Grand Format & PVC | ~31 | **13** |
| PLV & Chevalets | — | **8** (1 Roll-up + 1 X-Banner + structures) |
| Impression sans finition | 2 | **3** (+ PVC opaque/translucide, sans utilitaire remises) |

Anomalies encore en Grand Format POS : **0**

## Articles mal classés — avant → après

| Article | Ancienne cat. | Action | Nouvelle cat. / cible |
|---------|---------------|--------|------------------------|
| Roll up standard 200x80 (AVD008 / GF013) | Grand Format | Archivé POS + `visiblePOS=false` | → `plv-rollup` |
| Roll up deluxe (AVD009) | Grand Format | Idem | → `plv-rollup` (type deluxe) |
| X-Banner 180x80 (AVD011 / GF014) | Grand Format | Idem | → `plv-xbanner` |
| Bâche 180 cm A2/A3/A4 (GF001–003) | Grand Format | Archivé | → **gf-bache** |
| Bâche 240/320 A0 + palier (GF004–005) | Grand Format | Archivé | → gf-bache (variables) |
| PVC translucide / opaque (GF008–009) | Grand Format | Réassigné | Impression sans finition |
| Plexiglass + Acrylic séparés | Grand Format | Archivé | → **gf-plexi** |
| Vinyle / Indéchirable doublons GF006/007/012 | Grand Format | Archivé | canoniques gf-* |
| Photo grand format (GF011) | Grand Format | Réassigné | Photo |

## Ce qui reste dans Grand Format & PVC (13)

1. Acrylic / Plexiglas  
2. Autocollant Réfléchissant 140G  
3. **Bâche** (unique)  
4. Dos bleu 120G  
5. Frosted Film Sablé 140G  
6. One-Way Vision 140G  
7. PP Film indéchirable  
8. PVC **rigide** (plaque)  
9. Papier Photo GF 140G (matière m²)  
10. Tissu drapeau  
11. Toile canvas  
12. Vinyle blanc autocollant  
13. Vinyle transparent  

## Source corrigée (couches)

| Couche | Fichier / action |
|--------|------------------|
| Détection doublons | `lib/pos/grand-format-redundant.ts` |
| Merge / archive DB | `lib/services/merge-grand-format-articles.service.ts` |
| Sync DirectSale | archive + **`visiblePOS=false`** sur AVD008/009/011 |
| Sync GrandFormatPricing | archive ligne + pas de carte POS |
| Builder POS | `isNeverPosCard` + filet `grand_format` |
| Filtre UI POS | `use-pos-catalog-filters.ts` |
| Admin Catalogue filtre GF | `article-catalog-utils.ts` + navigator |
| Admin GF prix | `listGrandFormatPricing` **exclut archivés** |
| Boot | `getPosCatalogue` merge + repair |
| Scripts | `npm run repair:pos-categories` / `verify:pos-categories` |

## Doublons (zéro suppression métier)

Profils et lignes GF archivés avec préfixe `[archivé→…]` — conservés en DB, hors POS.

DirectSale AVD008/009/011 : fiches Admin conservées, **plus visibles POS** (prix sync → configurateurs).

## Tests

| # | Scénario | Résultat |
|---|----------|----------|
| 1 | GF sans Roll-up / X-Banner | OK |
| 2 | Roll up → PLV | OK |
| 3 | X-Banner → PLV | OK |
| 4 | PVC translucide hors GF | OK |
| 5 | PVC rigide reste GF | OK |
| 6 | Une seule Bâche | OK |
| 7 | Paliers bâche absents | OK |
| 8 | Plexi non doublonné | OK |
| 9 | Excel catégorie | OK (code) |
| 10 | F5 / boot merge | OK |
| 11 | AVD sous family GF forcée → exclus builder | OK |

Vitest : `tests/pos-grand-format-category.test.ts`

## Anomalies restantes

- Table Admin « Grand format — tarification » : lignes formats toutes archivées (liste active vide) — les matières POS vivent dans `ArticlePricingProfile` / catalogue `gf-*`. Réintroduire des lignes matière m² dédiées si besoin métier (sans formats/paliers).
- Configurateur Bâche : laizes/formats/paliers dans `lib/grand-format/bache-rules.ts`.

## Critère final

**Validé** : Grand Format & PVC = 13 supports/matières ; pas de PLV fini, pas de PVC A4 opaque/translucide, pas de formats/paliers bâche en cartes séparées ; Admin + POS ne réaffichent plus les doublons après F5.
