# AUDIT — Complétion Administration depuis POS (Grand Format)

Date : 2026-07-12  
Périmètre : Administration > Catalogue, Prix & Stock > Grand format

## Bugs corrigés (pass 2)

| Bug | Cause | Correctif |
|-----|--------|-----------|
| Table Admin vide après Sync / backfill | `syncGrandFormatPricingToPos` **archivait** les lignes `GrandFormatPricing` jugées « redondantes » | Les IDs canoniques `gf-*` ne sont plus archivés ; seule la carte POS / `visiblePOS` est ajustée |
| Backfill impossible après archive | `excelId` `@unique` + find excluant archived → create échoue en silence | Find **inclut** archived ; **restauration** au lieu de recréation |
| Photo GF marquée redondante | Regex `photo grand format` | Uniquement ancien id `GF011` |
| Une erreur abortait tout le backfill | Pas de try/catch par article | Erreurs isolées + compteur `errors` |
| Match trop large par `name` | Faux « preserved » | Match uniquement `reference` / `excelId` |

## Données POS détectées (canoniques)

`listCanonicalGrandFormatPosIds()` → **13** articles :

gf-vinyl-blanc, gf-vinyl-transp, gf-dosbleu, gf-bache, gf-tissu, gf-oneway, gf-reflechissant, gf-frosted, gf-photo, gf-pvc, gf-plexi, gf-pp, gf-toile

## Comportement

1. Service backfill — create / restore / preserve, laizes, prix manquants  
2. API GET auto-backfill si vide ; POST `seed-from-pos`  
3. UI bouton + empty state + badges « À compléter »  
4. Sync POS après create **ou** restore  

## Tests

`tests/grand-format-admin-backfill.test.ts` — IDs, anti-doublons, canoniques non redondants

## Utilisation

1. Ouvrir Grand format Admin  
2. Cliquer **Compléter Grand Format depuis POS** (restaure aussi les lignes archivées à tort)  
3. Compléter les prix manquants · Sync POS  
