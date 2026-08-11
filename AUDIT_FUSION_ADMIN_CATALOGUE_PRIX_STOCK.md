# AUDIT — Fusion Admin Catalogue + Prix + Stock

Date : 2026-07-11

## État avant

Sidebar Administration affichait **deux** entrées séparées :
- Catalogue POS
- Base Prix, Matières & Stock

→ confusion, double navigation, pas de centre unique.

## Modules fusionnés

| Avant | Après |
|-------|--------|
| Catalogue POS | → **Catalogue, Prix & Stock** |
| Base Prix, Matières & Stock | → même module |
| Alias `prices` / `stock` | → `catalog` |

Sidebar visible (4 macros) :
1. Vue d’ensemble  
2. **Catalogue, Prix & Stock**  
3. Production & Flux  
4. Organisation  

## Routes

| Route | Comportement |
|-------|----------------|
| `/administration/catalogue-prix-stock` | **Page unique** (nouveau) |
| `/administration/catalogue-pos` | Redirect → module unique |
| `/administration/prix-matieres-stock` | Redirect → module unique |
| `/administration/matieres` | Redirect → `?tab=matieres` |
| `/administration/prix-calculs` | Redirect → `?tab=vue` |

## Composants

- **Nouveau** : `CataloguePrixStockWorkspace.tsx` (header KPI + actions + onglets)
- **Réutilisés** (zéro suppression) : `CataloguePosUnifiedWorkspace` (`embedded`), `PrixMatieresStockWorkspace` (`embedded` + `forcedTab`), `CatalogueAnomaliesPanel`
- Pages legacy = redirects (pas de suppression de fichiers)

## Design

Header unique :
- titre Catalogue, Prix & Stock
- Sync POS / Export / Import / Modèle / Nouvelle donnée
- KPI : Articles POS, Options, Matières, Prix manquants, Anomalies, Doublons
- Onglets métier unifiés (17)

## Sync

- `syncAdminToCommercialPOS` = alias de `syncAdminToPOS`
- Bouton Synchroniser POS dans le header du module

## Tests

| Test | Résultat |
|------|----------|
| 4 macros sidebar | OK (`admin-macro-fusion.test.ts`) |
| Labels sans doublon Catalogue/Base Prix | OK |
| Hub URL unique | OK |

## Nettoyage onglets (2026-07-11)

Doublons retirés de la barre d’onglets :
- **Catégories** + **Options / Chips** + **Articles POS** → un seul onglet **Articles & Options** (`?tab=catalogue`)
- Alias URL `categories` / `chips` / `articles` → `catalogue` (redirect silencieuse)
- Même workspace catalogue (liste articles + catégorie + chips + dépendances)
