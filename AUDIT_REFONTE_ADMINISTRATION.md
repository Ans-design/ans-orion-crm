# AUDIT — Refonte Administration

Date : 2026-07-11

## État avant

- Sidebar déjà structurée en 5 macros, mais libellé « Prix, Matières & Stock ».
- Hub fusionné avec un seul onglet « Matières, Stock & Prix » (après fusion du doublon Matières / Prix de base).
- Micro-menus `prices` très longs (équivalences, promo, tampons, marges, historique…).
- Confusion visuelle entre identité matière et prix.

## Problèmes trouvés

1. Libellé hub / macro pas aligné avec la cible « Base Prix, Matières & Stock ».
2. Pas d’onglet dédié « Prix par contexte » (MaterialContextPrice).
3. Pas d’onglet dédié « Stock & Achats ».
4. Micro-menus redondants (AVD listé sous Catalogue et sous Prix).

## Corrections faites

- Renommage macro + hub + routes breadcrumb → **Base Prix, Matières & Stock**.
- Onglets hub : Vue globale · Matières · Prix par contexte · Stock & Achats · ISF · GF · AVD · Finitions · Paliers · Règles · Excel · Anomalies · Corbeille · Historique.
- Panel **Prix par contexte** branché sur `/api/admin-backoffice/pricing/base-prix-matieres?kind=context-prices`.
- Micro-menus `prices` recentrés sur les deep-links hub ; AVD retiré du menu Catalogue (reste dans le hub).
- Entrée Catalogue **Anomalies & Doublons**.

## Fichiers modifiés

- `lib/administration/admin-macro-modules.ts`
- `lib/administration/routes.ts`
- `components/administration/prix-matieres-stock/PrixMatieresStockWorkspace.tsx`
- `components/administration/materials/MaterialsUnifiedWorkspace.tsx`
- `tests/admin-macro-fusion.test.ts`

## Tests

| Test | Résultat |
|------|----------|
| `tests/admin-macro-fusion.test.ts` | À rejouer (attendu OK) |
| Navigation manuelle hub onglets | À valider en UI |

## Corrections faites (passe 2 — intégration)

- UI **Anomalies & Doublons** dans Catalogue POS (`view=anomalies`) + compteurs POS Commercial
- `posCatalogIndexService` + API `/api/admin-backoffice/pos-catalog-index`
- `excelImportSyncService` branché sur imports catalogue + hub prix
- Mutations article + merges → `invalidatePOSCache` / `syncAdminToPOS`
- Table Prisma **OptionDependency** + API + chargement POS
- Backoffice modules : « Base Prix, Matières & Stock » (stock = alias)
- Sync Admin→POS remonte compteurs catégories + total articles

## Fichiers clés

- `components/administration/catalogue/CatalogueAnomaliesPanel.tsx`
- `lib/services/pos-catalog-index.service.ts`
- `lib/services/excel-import-sync.service.ts`
- `lib/services/option-dependency.service.ts`
- `prisma/schema.prisma` (OptionDependency)

## Bugs restants

- Preview/rollback Excel non uniformisés
- Feuilles Excel 11–13 encore partiellement placeholders
- UI CRUD OptionDependency dans le studio chips (API prête)
