# AUDIT — Sync Administration ↔ POS Commercial

Date : 2026-07-11

## État avant

- Syncs dispersées : `syncCatalogueProfilesToDb`, `catalog-options-sync`, `direct-sale-pos-sync`, `rebuildPOSPriceIndex`, merges boot `getPosCatalogue`.
- Bouton « Synchroniser POS » Admin = `syncBackofficeCatalog` = catalogue profiles seulement.
- Pas d’orchestrateur unique `syncAdminToPOS`.

## Problèmes trouvés

1. Sync POS Admin incomplète (options / prix / AVD non enchaînés).
2. Invalidation cache via `notifyAdminModuleMutation` non garantie après sync bouton.
3. Doublons catalogue détectables mais sync ne les remonte pas dans le rapport.

## Corrections faites

- Nouveau service `lib/services/admin-to-commercial-sync.service.ts` :
  - `syncAdminToPOS` / `adminToCommercialSyncService.syncAll`
  - `syncPricesToPOS`, `syncMaterialsToPOS`, `syncCategoriesToPOS`, `syncChipsToPOS`
  - `invalidatePOSCache`, `createAuditLog`
  - `detectCatalogDuplicates`, `detectPricingDrift` (rapport)
- `syncBackofficeCatalog` délègue à `syncAdminToPOS`.
- API `/api/backoffice/sync` (et alias admin-backoffice/sync-pos) passe userId/userName.

## Fichiers modifiés

- `lib/services/admin-to-commercial-sync.service.ts` (nouveau)
- `lib/server/modules/backoffice/backoffice-sync.service.ts`
- `app/api/backoffice/sync/route.ts`

## Tests

| Test | Résultat |
|------|----------|
| POST sync-pos depuis Admin | À valider (message + audit) |
| Goodies chips après sync | Déjà couvert par sync options |
| Drift prix après sync | Compteur dans rapport |

## Bugs restants

- Sync full peut être lente (tous AVD publiés + goodies).
- Cache navigateur POS : F5 côté client parfois encore nécessaire.
- OptionDependency table générique hors Goodies : partiel (Goodies OK).
