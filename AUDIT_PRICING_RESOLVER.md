# AUDIT — pricingResolver

Date : 2026-07-11

## État avant

- `lib/pricing/pricing-resolver.ts` déjà point d’entrée unique vers MaterialContextPrice + règles.
- Moteurs spécialisés : ISF, GF, AVD, goodies, photobook, etc. via `calculateFinalPOSPrice` / dynamic-engine.

## Problèmes trouvés

1. Noms d’API du brief (`resolveArticlePrice`, `resolveMaterialPrice`…) pas tous exposés en alias.
2. Breakdown POS (source / formule / options / remise) encore partiel selon article.
3. Fallback `BaseMaterial.basePrintPrice` si pas de MaterialContextPrice (volontaire, pas de seed inventé).

## Corrections faites

- Alias ajoutés sur `pricingResolver` :
  - `resolveMaterialPrice`, `resolveArticlePrice`
  - `resolveDirectPrice`, `resolveHybridPrice`
  - `applyQuantityTier`, `applyPromotionRule`, `validateCompatibility`
  - `returnPriceBreakdown` → `calculateFinalPOSPrice`
- Hub Admin clarifie : prix = MaterialContextPrice ; règles = onglet Règles.

## Architecture cible

```
BaseMaterial (identité)
    └── MaterialContextPrice (prix par contexte)
            └── pricingResolver → POS Commercial
PricingRule / paliers / promo → appliqués après
Catalogue POS = structure (pas de prix dupliqué)
```

## Tests

| Test | Résultat |
|------|----------|
| `tests/pricing-fusion-architecture.test.ts` | Existant |
| Tirage photo A4/A5/A6 | À rejouer côté POS |
| Photobook souple/rigide | À rejouer |
| Goodies pricing | `tests/goodies-pricing.test.ts` |

## Bugs restants

- `applyFinishingPrice` pas encore alias dédié (finition via moteurs finitions / AVD).
- Breakdown UI POS à uniformiser sur tous les configurateurs.
