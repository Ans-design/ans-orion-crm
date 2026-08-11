# AUDIT — Import / Export Excel

Date : 2026-07-11

## État avant

- Exports/imports par domaine déjà présents (matières, AVD, finitions, GF, catalogue, goodies…).
- Hub Excel documente les feuilles multi-export `prix-matieres-stock/export-excel`.
- Pas de garantie unique « après import → syncAdminToPOS » sur tous les endpoints.

## Problèmes trouvés

1. Couverture Excel inégale selon onglet (certaines vues ont Import/Export, d’autres non).
2. Prévisualisation / annulation critique absente sur plusieurs routes.
3. Feuille `02_Prix_Par_Contexte` dépend de MaterialContextPrice peuplé (migration).

## Corrections faites (cette passe)

- Hub Excel / onglets alignés sur la structure cible (libellés Import / Export Excel).
- Sync POS post-mutation renforcée via orchestrateur (bouton Sync = full pipeline).
- Documentation des feuilles attendues conservée dans le hub Excel.

## Feuilles cibles

| # | Feuille | Statut |
|---|---------|--------|
| 01 | Matieres | OK (export hub / stock-matieres) |
| 02 | Prix_Par_Contexte | Partiel (API context-prices + export multi) |
| 03 | Stock_Achats | Partiel (colonnes matières) |
| 04 | Catalogue_Articles | OK |
| 05 | Options_Chips | OK (catalogue / goodies) |
| 06–11 | ISF / GF / AVD / Finitions / Paliers / Règles | OK via workspaces dédiés |
| 12 | Categories_POS | Via catalogue + repair-categories |
| 13 | Anomalies | OK (export anomalies) |

## Tests

| Test | Résultat |
|------|----------|
| Export hub multi-feuilles | À rejouer |
| Import matière → POS | Après Sync Admin→POS |
| Import AVD | Sync déjà dans services AVD |
| Prévisualisation dryRun hub | OK (UI + API `dryRun=1`) |
| Confirm / Annuler import | OK (UI hub Excel) |

## Passe 3

- Prévisualisation Excel hub + confirmation + annulation
- Import bloqué si erreurs en preview
- Alias feuille `02_Prix_Par_Contexte`
- Onglet Catalogue **Dépendances** (CRUD OptionDependency)

## Passe 4 — atomique + modèles

- Import via `prix-matieres-stock-excel-import.service.ts` : plan → validation → `$transaction` (tout ou rien)
- Erreurs → `aborted: true`, **aucune écriture**
- Modèle Excel : `GET .../export-excel?template=1` + bouton UI « Télécharger modèle Excel »
- Feuille `00_Guide` + exemples 01–13

## Bugs restants

- Sync ISF `upsertMaterialContextPrice` hors tx pour contextes hors feuille 03 est désormais inline dans la tx.
- Modèles Excel par onglet métier isolé (ISF seul, AVD seul) restent sur les workspaces dédiés.
