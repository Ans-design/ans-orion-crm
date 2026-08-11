# AUDIT — Fusion module Admin Prix, Matières & Stock

Date : 2026-07-11

## Objectif

Fusionner **Prix & Calculs** + **Stock & Matières** en un seul module Administration, sans perte de données ni casse POS.

## Sidebar (5 macros)

| # | Macro | Route hub |
|---|--------|-----------|
| 1 | Vue d'ensemble | `/administration/vue-ensemble` |
| 2 | Catalogue POS | `/administration/catalogue-pos` |
| 3 | Prix, Matières & Stock | `/administration/prix-matieres-stock` |
| 4 | Production & Flux | `/administration/production-flux` |
| 5 | Organisation | (users / audit / import…) |

Plus de séparation visuelle Prix & Calculs / Stock & Matières.

## Redirections legacy (zéro casse)

| Ancienne route | Nouvelle |
|----------------|----------|
| `/administration/matieres` | `…/prix-matieres-stock?tab=matieres` |
| `/administration/prix-calculs` | `…/prix-matieres-stock?tab=vue` |
| `/administration/base-prix-matieres` | `…/prix-matieres-stock?tab=vue` |

## Onglets du module fusionné

Vue globale · Matières & Stock · Prix de base · Impression SF · Grand format · Vente directe · Finitions · Paliers · Règles · Import/Export · Anomalies · Corbeille · Historique

Chaque onglet réutilise le workspace métier existant (MaterialsUnifiedWorkspace, ImpressionSfWorkspace, etc.) — **pas de réécriture destructive**.

## Données

- Source : `BaseMaterial` + `MaterialContextPrice` (déjà en place)
- Sync : `pricingDataSyncService` / `pricingResolver`
- Export multi-feuilles : `/api/admin-backoffice/pricing/prix-matieres-stock/export-excel`

## Tests

| Test | Résultat |
|------|----------|
| 5 macros sidebar | OK |
| Labels fusion | OK |
| Hub URL | OK |
| macroForModule stock→prices | OK |

Fichier : `tests/admin-macro-fusion.test.ts`

## Critères

| Critère | Statut |
|---------|--------|
| Modules fusionnés UI | OK |
| Données non perdues | OK (redirect + workspaces existants) |
| Anciennes routes | OK |
| Corbeille / historique | OK (via MaterialsUnifiedWorkspace) |
| Import/export onglet | OK (workspaces) + export complet |
| Doublons | OK (onglet Anomalies) |
| POS pricingResolver | OK (inchangé) |
| Sidebar 5 modules | OK |

## Suite

- Brancher `view=corbeille` / historique sans double barre d’onglets matières
- Remplir feuilles Excel 07–09 depuis les tables règles/paliers/limites
- Badge anomalies sur macro Prix, Matières & Stock
