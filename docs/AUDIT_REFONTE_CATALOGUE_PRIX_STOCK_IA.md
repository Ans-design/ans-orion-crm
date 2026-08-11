# Audit & cartographie — Refonte Catalogue, Prix & Stock

**Sources** (15 juil. 2026) :
- `Ultra_Prompt_Refonte_Catalogue_Prix_Stock_ORION.txt`
- `orion_catalogue_stock_refondu.html` (maquette 5 domaines)
- `gemini-code-*.txt` (charte SaaS Slate + brand parcimonieux)

**Règle projet** : zéro suppression métier — domaines retirés de la nav restent en alias / deep-links.

## IA cible — 5 domaines

| Domaine | URL `studio=` | Rôle |
|---------|---------------|------|
| Tableau de bord | `cockpit` | Santé, KPI, priorités actionnables (pas de raccourcis = menu) |
| Matières & formats | `matieres` | **Une grille** : identité + coût + prix vierge + prix imprimé + stock |
| Prix & règles | `prix` | Articles, formules, options/chips, finitions |
| Import / Export | `excel` | Modèles & mises à jour |
| Historique | `historique` | Journal + corbeille |

### Alias masqués (conservés)

| Ancien | Redirige vers |
|--------|----------------|
| `articles` (Catalogue) | `prix` + `tab=articles` |
| `finitions` | `prix` + chips/finitions |
| `anomalies` | `cockpit` + `tab=anomalies` |
| `tab=prix-contexte` / `stock` | `matieres` (grille unifiée) |

## Frontières métier

- **Matières** = ce qu’on achète / stocke / transforme (une ligne par variante).
- **Prix & règles** = comment on vend (formules référençant `materialKey` / id matière, sans copie locale).
- **POS** consomme la DB publiée — pas de micro-réglages POS dispersés dans la grille matières.

## Mapping prix matière (grille unifiée)

| Colonne UX (maquette) | Champ existant | Notes |
|-----------------------|----------------|-------|
| Coût achat | `purchasePrice` / `materialCost` | Source achat |
| Prix vierge | `maxPrice` (`maxSafetyPrice`) | Affiché comme « Prix vierge » ; Tranche 1 pourra ajouter `blankSellPrice` dédié |
| Prix imprimé | `basePrintPrice` | Prix base impression |
| Stock dispo | `stockAvailable` / `stockDisplay` | Lien stock |

Statuts affichés : **Actif / Archivé / Alerte** — plus de Brouillon/Publié dans la grille matières hub.

## Services / API touchés

- Shell : `CataloguePrixStockWorkspace`, `CatalogStudioNav`, `CockpitStudio`
- Matières : `MaterialsUnifiedWorkspace`, `BaseMaterialPricesTable`, `MaterialMasterDataTable`
- Prix : `PricingArticlesWorkspace`, `PricingFamilyCards`, chips/finitions
- API cockpit : `/api/admin/catalogue/cockpit`
- Prix unifiés : `/api/admin-backoffice/pricing/base-material-prices`

## Charte Gemini / ORION

- Slate + blanc, brand rouge parcimonieux, radius **7px**, shadow-sm, toasts (`uxToast`), tables sans traits verticaux.
- Tokens : `catalogue-prix-stock-light.css`

## Tranches — statut

| Tranche | Statut |
|---------|--------|
| 0 Audit | Ce document |
| 1 Contrat data / migrations champs vierge dédiés | Préparé (mapping actuel) |
| 2 Nav 5 + cockpit | Fait |
| 3 Grille matières unifiée | En cours dans le code |
| 4–10 | Suivantes (prix, options, POS, corbeille, design, excel, recette) |

## Rollback

Aucun drop de table. Alias URL + studios `hidden` permettent de revenir sans migration inverse.
