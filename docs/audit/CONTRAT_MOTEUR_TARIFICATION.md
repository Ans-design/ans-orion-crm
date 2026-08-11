# Contrat moteur de tarification — Vague 2 (V2-03)

| Date | 2026-07-18 |
|------|------------|
| Statut | Canonique **identifié** ; divergences mesurées ; correctifs sûrs appliqués |

## 1. Source officielle

| Couche | Fichier | Rôle |
|--------|---------|------|
| **Cœur** | `lib/pricing/calculate.ts` → `calculatePrice()` | Pipeline unique (dynamique → moteurs métier → legacy → paliers → remises → frais → TVA) |
| Façade POS enrichie | `lib/pricing/ans-price-store.ts` → `resolvePrice()` | Diagnostics + sur devis |
| Façade unifiée | `lib/pricing/pricing-engine.ts` → `computeUnifiedPrice` | Délègue à `calculatePrice` |
| Façade POS réduite | `lib/pricing/pricing-resolver.ts` → `calculateFinalPOSPrice` | PU + source (corrigé V2) |

**Règle :** tout nouveau calcul de vente doit passer par `calculatePrice` (ou `resolvePrice` qui l’appelle). Ne pas créer de 3ᵉ pipeline parallèle.

## 2. Consommateurs

| Module | Entrée | Resolver |
|--------|--------|----------|
| POS preview / calculate | API | `calculatePrice` / `resolvePrice` |
| Panier → devis | `cart-service` | `calculatePrice` puis **snapshot figé** |
| Devis API générique | body | **accepte PU fourni** (risque — documenté) |
| Commande | acceptation devis | **copie**, pas de recalcul |
| Facture | workflow | **copie** commande + arrondi MGA |
| Simulate admin | API | `resolvePrice` |
| Import Excel tarifs | backoffice | écrit draft, **ne calcule pas** |

## 3. Contrat d’entrée / sortie

**Entrée :** `articleId`, `configuration` (qty, dims, matière, options…), options (`skipDynamic`, `priceReason`, forçages).

**Sortie `PriceResult` :** `prixUnitaire`, `sousTotal`, `remise*`, `totalHT`, `totalTTC`, `snapshot.priceSource`, `formulaApplied`.

**Arrondi :** Ariary entier via `Math.round` / `lib/pricing/mga-round.ts` (`roundMga`, `htToTtcMga`, `ttcToHtMga`).

## 4. Invariants

1. Même entrée + même version publiée → même résultat (POS = simulate = panier).
2. Prix non publié absent du POS (`loadPosDynamicContext` = published only).
3. Snapshot immuable après devis accepté → commande → facture.
4. Formule incomplète → `surDevis` / erreur explicite, pas prix 0 silencieux.
5. `calculateFinalPOSPrice.source` = `snapshot.priceSource` (**corrigé** V2).

## 5. Divergences connues (non fusionnées brutalement)

| Divergence | Gravité | Action |
|------------|---------|--------|
| Devis générique / import acceptent PU sans moteur | P1 | Caractériser + progressivement forcer recalcul |
| `resolveDirectSalePrice` court-circuit possible | P2 | Tests + aligner sur `calculatePrice` |
| Moteurs dédiés avant dynamique | P2 | Intentionnel — documenter familles |
| Arrondi HT facture non arrondi | P1 | **Corrigé** (`ttcToHtMga`) |

## 6. Tests

- `tests/pricing-resolver-golden.test.ts` (Lot 3)
- `tests/v2-pricing-canonical.test.ts` (source + MGA)
- Familles existantes (`flyer`, `carterie`, `textile`, …)

Ne pas inventer de formules manquantes — voir `RAPPORT_RECUPERATION_FORMULES` / inventaire sauvegardes.
