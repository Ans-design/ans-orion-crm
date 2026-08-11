# AUDIT — Refonte Light Mode Admin Catalogue, Prix & Stock

**Date :** 2026-07-11  
**Référence UI :** `maquette_interactive_erp_ans_orion (2).html` (Light Mode — bg-gray-50, brand blue-600, Inter, rounded-2xl)  
**Maquette dark (1) / principale :** structure fonctionnelle (onglets, KPI, drawer, Excel, anomalies) — **non** utilisée comme thème.

## Objectif

Appliquer le design SaaS B2B Light Mode sur `/administration/catalogue-prix-stock` **sans** mocker les données, **sans** toucher pricingResolver / formules / Prisma / sync POS.

## Maquette → Produit

| Élément maquette | Implémentation |
|---|---|
| Fond gray-50 / surfaces white | `.cps-light` + `catalogue-prix-stock-light.css` |
| Header fixe + badge sync | `AdminHeader.tsx` |
| KPI cliquables | `KpiCards.tsx` → filtre onglets |
| Pills scrollables | `PillTabs.tsx` (16 onglets) |
| Smart DataGrid | `SmartDataGrid.tsx` + `InlineEditableCell` |
| Marge / Stock badges | `MarginIndicator.tsx`, `StockStatusBadge.tsx` |
| Options/Chips split | `OptionsChipsEditor` → `OptionsChipsWorkspace` réel |
| Excel moderne | `ExcelManager` → hub `forcedTab="excel"` |
| Anomalies | `AnomalyCenter` → `CatalogueAnomaliesPanel` |
| Drawer | `EntityDrawer.tsx` (shell + jauge marge) |
| Réappro express | `ReapproExpressBar.tsx` |
| Sidebar 4 macros | Déjà dans `admin-macro-modules.ts` ; `AdminSidebar` optionnel (non monté — AppShell) |

## Composants créés

`components/admin/catalogue-prix-stock/` :

- AdminCatalogueShell, AdminHeader, AdminSidebar  
- KpiCards, PillTabs  
- SmartDataGrid, InlineEditableCell  
- MarginIndicator, StockStatusBadge  
- EntityDrawer, ReapproExpressBar  
- ExcelManager, AnomalyCenter, OptionsChipsEditor  
- catalogue-prix-stock-light.css, index.ts  

Workspace branché : `components/administration/catalogue-prix-stock/CataloguePrixStockWorkspace.tsx`

## Routes fusionnées (inchangées / confirmées)

| Ancienne | Cible |
|---|---|
| `/administration/catalogue-pos` | `/administration/catalogue-prix-stock` |
| `/administration/prix-calculs` | `?tab=vue` |
| `/administration/matieres` | `?tab=matieres` |
| `/administration/prix-matieres-stock` | hub unique |
| `/administration/base-prix-matieres*` | hub unique |

Sidebar macros visibles : **Vue d’ensemble · Catalogue, Prix & Stock · Production & Flux · Organisation**  
Tests : `tests/admin-macro-fusion.test.ts`

## Données & formules préservées

- Aucun seed / reset DB  
- Aucune donnée mock dans les onglets métier  
- Workspaces existants embarqués : Catalogue POS, Prix/Matières/Stock, Corbeille matières, OptionsChips  
- Services appelés : sync-pos API, pos-catalog-index, base-material-prices, drifts, detect-duplicates, export-excel  

**Non modifié dans cette passe :** pricingResolver, règles photo/photobook/goodies/grand format, calculs A3/A4/…, Prisma schema.

## Synchronisation

- Bouton **Synchroniser POS** → `POST /api/admin-backoffice/sync-pos`  
- Badge : synced / pending / error  
- Import Excel : flux hub existant (dry-run / validation / toasts)

## Tests checklist

| Test | Statut |
|---|---|
| Page Light Mode (scope `.cps-light`) | OK (UI) |
| Header + KPI + pills | OK |
| 16 onglets maquette | OK |
| Sidebar sans doublon Catalogue/Prix | OK (macros) |
| Données réelles via workspaces | OK |
| Formules / pricingResolver non touchés | OK |
| Drawer shell | OK (orientation métier) |
| SmartDataGrid réutilisable | OK (composant prêt) |
| Inline edit sur tous les tableaux legacy | Partiel — composant prêt, migration progressive |
| Drag & drop ordre chips | Partiel — conservé dans OptionsChipsWorkspace existant |
| Nettoyage Magique simulation | Délégué au panel anomalies existant |

## Migration SmartDataGrid (itération suivante)

| Tableau | Statut |
|---|---|
| PriceTableWorkspace (GF / Finitions) | OK — SmartDataGrid + inline prix + marge |
| DirectSale articles | OK — InlineEditableCell prix + sync POS |
| Prix par contexte | OK — SmartDataGrid + inline Prix HT / Coût + jauge marge |
| API `update-context-price` | OK — POST base-prix-matieres (Prisma MaterialContextPrice) |
| BaseMaterialPricesTable (matières) | À migrer (table très riche — non cassée) |
| ChipsDataTable | Actions unifiées déjà ; grille SmartDataGrid optionnelle |

Inline edit : double-clic → Entrée sauve / Échap annule → API réelle → toast.

1. Ouvrir `http://127.0.0.1:3020/administration/catalogue-prix-stock` en session admin  
2. Cliquer chaque KPI → bon onglet  
3. Modifier un prix matière → toast + sync  
4. Import Excel dry-run → rapport sans `alert()`  
5. F5 → KPIs et onglet URL conservés  
6. Contraster thèmes ERP dark vs zone Light `.cps-light` (isolée)

## Bugs corrigés / risques

- ExcelManager : pas de mock — délègue au hub réel  
- Double Corbeille : onglet module + sous-vues tableaux (maquette + pattern antérieur)  
- Drawer « Nouvelle donnée » oriente vers Articles — création complète reste dans workspaces métier (zéro inventaire parallèle)

## Verdict

**UI Light Mode livrée** sur le hub unique, **données & APIs intactes**. Migration complète de tous les tableaux legacy vers `SmartDataGrid` = itération suivante (sans toucher aux formules).
