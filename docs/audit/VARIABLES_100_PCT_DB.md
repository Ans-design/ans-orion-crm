# Variables tarification — 100 % DB (Lot 3 P0)

## Objectif

Les variables globales de prix vivent en `PricingVariable` (Prisma). Les fallbacks statiques (`DEFAULT_GLOBAL_PRICING`, coeffs 1.8 / 12 %) restent pour démarrage / DB absente.

## Chaîne de lecture

```text
DEFAULT_GLOBAL_PRICING
  ← systemConfig.global_pricing
  ← PricingVariable (codes actifs, scope global)
```

Helper : `mergePricingVariablesIntoGlobalConfig` dans `lib/pricing/global-config.ts`.  
Consommé par POS (`getGlobalPricingConfig`) et admin API (`global-pricing.service`).

## Sync seed

`seedGlobalPricingVariables` : **create** avec valeur seed ; **update** met à jour label/unit/scope/version **sans écraser `value`** (ni `source`).

## Write-through admin

`updateGlobalPricingConfig` sauvegarde `systemConfig` puis upsert les codes mappés (`tva_default`, production_*, `bat_physique_papier`, `livraison_*`).

## UI CRUD dédiée ✅

- Page : `/administration/variables` — édition valeur par code (scope global)
- API : `GET|PATCH /api/admin-backoffice/pricing/pricing-variables` (`tarifs:read` / `tarifs:write`)
- Service : `lib/server/modules/pricing/pricing-variables.service.ts`
- Nav : `admin_variables_nav` actif (sidebar Administration)
- PATCH d’un code `GLOBAL_PRICING_VARIABLE_CODES` → resync `systemConfig.global_pricing` (write-through inversé)
- Fallbacks + `TarifsLegacyGrid` (`/tarifs`) conservés ; studio chips catalogue inchangé

## Coeffs moteur

| Code | Usage | Fallback |
|------|--------|----------|
| `face_recto_verso_mult` | × Recto-Verso (`dynamic-engine`, `calculate`) | 1.8 |
| `finition_surcharge_pct` | % par finition (`applyFinitionSurcharge`) | 12 |

## Reste

- CSP enforce (Lot 8)
