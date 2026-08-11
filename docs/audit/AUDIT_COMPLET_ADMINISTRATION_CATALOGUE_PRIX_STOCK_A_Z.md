# Audit complet A→Z — Administration Catalogue / Prix & Stock

| Métadonnée | Valeur |
|---|---|
| Projet | ANS ORION |
| Périmètre | Administration Catalogue, Prix, Stock (hub + pages spécialisées + APIs + services + Prisma) |
| Date | 2026-07-19 |
| Méthode | Lecture code + routes + APIs + Prisma + tests + docs (aucune modification métier) |
| Verdict | **GO local** · **GO staging conditionnel** · **NO-GO production** (backup PG manquant + sync non atomique) |
| PDF ultracomplet | `docs/audit/AUDIT_ULTRACOMPLET_ADMINISTRATION_CATALOGUE_PRIX_STOCK_ANS_ORION.pdf` · aussi dans `Téléchargements` |

---

## Table des matières

1. [Synthèse exécutive](#1-synthèse-exécutive)
2. [Cartographie quantitative](#2-cartographie-quantitative)
3. [Routes & pages (exhaustif)](#3-routes--pages-exhaustif)
4. [Navigation & domaines](#4-navigation--domaines)
5. [Composants UI](#5-composants-ui)
6. [APIs](#6-apis)
7. [Services & lib](#7-services--lib)
8. [Modèle de données Prisma](#8-modèle-de-données-prisma)
9. [Flux métier](#9-flux-métier)
10. [Permissions & RBAC](#10-permissions--rbac)
11. [Tests & couverture](#11-tests--couverture)
12. [Bugs, gaps, risques (P0–P2)](#12-bugs-gaps-risques-p0p2)
13. [Incohérences documentation](#13-incohérences-documentation)
14. [Checklist A→Z de validation](#14-checklist-az-de-validation)
15. [Plan de priorisation](#15-plan-de-priorisation)
16. [Annexes — docs de référence](#16-annexes--docs-de-référence)

---

## 1. Synthèse exécutive

### Ce qui marche

- **Hub canonique unique** : `/administration/catalogue-prix-stock`
- **Nav 5 domaines visibles** + 3 alias techniques (zéro suppression de routes)
- **Alias legacy** conservés (`/catalogue-pos`, `/matieres`, `/prix-matieres-stock`, `/admin/pricing`…)
- **Fiche produit unifiée** sous Studio Prix (liste dense + sheet)
- **Matières unifiées** (référentiel / formats / coûts / stock / usages / anomalies)
- **`getPosCatalogue()` lecture pure** — maintenance explicite via sync
- **Consommation stock production** centralisée + idempotence (Vague 2)
- **Guards déploiement** fail-closed (`ALLOW_*` pour `--accept-data-loss`)

### Ce qui bloque la production

| ID | Bloquant | Impact |
|---|---|---|
| D-01 | Backup PostgreSQL restaurable **manquant** | NO-GO migrate / seed / rollback données |
| D-02 | Drift Prisma sqlite ↔ postgres | Schéma patché seulement au build Hostinger |
| S-01 | Sync Admin→POS **non atomique** multi-entités | Risque d’état partiel après sync |
| S-02 | Dualités de modèles (`ArticlePricingProfile` / `ProductPricingProfile`, legacy `SalePrice2026`) | Drift tarifaire possible |

### Architecture cible (règle maître)

```text
Backoffice configure → Prisma stocke → Modules consomment
Admin → DB → sync → POS / Devis / Stock / Production
```

Hub central métier hors admin : `/commandes/[id]`  
Hub admin catalogue : `/administration/catalogue-prix-stock`

---

## 2. Cartographie quantitative

| Zone | Quantité (approx. 2026-07-19) |
|---|---|
| Pages `app/(app)/administration/**/page.tsx` | **40** |
| Routes API `app/api/admin-backoffice/**/route.ts` | **138** |
| Composants `components/admin/catalogue-prix-stock/*.tsx` | **28** |
| Studios techniques (`CatalogStudioId`) | **8** |
| Domaines visibles nav | **5** |
| Alias / studios cachés | **3** (`articles`, `finitions`, `anomalies`) |

---

## 3. Routes & pages (exhaustif)

### 3.1 Hub canonique

| Route | Fichier | Rôle |
|---|---|---|
| `/administration/catalogue-prix-stock` | `app/(app)/administration/catalogue-prix-stock/page.tsx` | Hub unique Catalogue + Prix + Stock + Options + Excel + Anomalies |

Workspace : `components/administration/catalogue-prix-stock/CataloguePrixStockWorkspace.tsx`

### 3.2 Alias → hub (redirections)

| Route | Redirection |
|---|---|
| `/administration/catalogue-pos` | Hub CPS (mapping studio/view/article) |
| `/administration/matieres` | `?studio=matieres` |
| `/administration/prix-matieres-stock` | Hub (conserve `tab` / `view`) |
| `/administration/base-prix-matieres` | `?tab=vue` |
| `/administration/prix-calculs` | `?tab=vue` |

#### Mapping `/administration/catalogue-pos`

| Entrée | Sortie |
|---|---|
| `view=anomalies` ou `action=detect-duplicates` | `studio=cockpit&tab=anomalies` |
| `view=corbeille` | `studio=historique&tab=corbeille` |
| `studio=chips` (sans article) | `studio=prix&tab=chips` |
| défaut | `studio=prix&tab=articles` |
| + `article` | conserve `article` + `sheet=options` |

### 3.3 Paramètres URL du hub

| Param | Valeurs / rôle |
|---|---|
| `studio` | `cockpit` · `matieres` · `prix` · `excel` · `historique` (+ alias `articles` · `finitions` · `anomalies`) |
| `tab` | `vue` · `articles` · `chips` · `matieres` · `overview` · `engines` · `regles` · `finitions` · `excel` · `anomalies` · `historique` · `corbeille` · familles (`isf`, `flyers`, …) |
| `view` | Sous-vues matières : `referentiel` · `formats` · `couts` · `stock` · `usages` · `anomalies` |
| `article` | Ouvre fiche produit |
| `sheet` / `section` | Section fiche (`options`, `paliers`, `infos`, …) |
| `legacyConfig=1` | Force ancien `CataloguePosUnifiedWorkspace` |
| `action` | ex. `detect-duplicates` |

#### Normalisations de tabs

| Alias reçu | Tab résolu |
|---|---|
| `catalogue`, `categories`, `pos`, `options` | `articles` |
| `formule`, `formulas` | `regles` |
| `sim`, `simulateur`, `simulation` | `overview` |
| `version`, `versions` | `overview` |
| `bibliotheque`, `options-lib` | `chips` |
| `prix-base` | `matieres` |
| `prix-contexte` | matières + `view=couts` |
| `stock` (tab) | matières + `view=stock` |

### 3.4 Pages Administration spécialisées (conservées)

#### Catalogue / matières / prix / stock

- `/administration/articles-vente-directe`
- `/administration/paliers-vente-directe`
- `/administration/matieres-vierges`
- `/administration/impression-sf`
- `/administration/grand-format-prix`
- `/administration/finitions-reliures`
- `/administration/design-graphique`
- `/administration/base-prix-matieres`
- `/administration/prix-matieres-stock`
- `/administration/prix-calculs`

#### Règles & paramètres tarifaires

- `/administration/parametres-formats-papier`
- `/administration/parametres-impression`
- `/administration/equivalences-services`
- `/administration/equivalences-matieres`
- `/administration/regles-support`
- `/administration/regles-promo-articles`
- `/administration/limites-matieres-formats`
- `/administration/flyer-regles`
- `/administration/carterie-regles`
- `/administration/publications-regles`

#### Familles produits

- `/administration/packaging` · `packaging-sac` · `packaging-soft`
- `/administration/textile` · `goodies` · `tampons`
- `/administration/photobook` · `tirage-photo` · `formats-photo` · `cadre-photo`
- `/administration/carnet-autocopiant`

#### Contrôle / sync / shell

- `/administration/synchronisation`
- `/administration/vue-ensemble`
- `/administration/backoffice`
- `/administration/production-flux`
- `/administration` (index)
- `/administration/[section]` (alias dynamiques)

### 3.5 Alias dynamiques (`lib/administration/routes.ts` + `backoffice-redirects.ts`)

| Section | Destination typique |
|---|---|
| `catalogue`, `articles`, `options`, `apercus` | Hub CPS |
| `matieres`, `grammages`, `formats`, `laizes`, `stock` | Hub matières |
| `prix`, `formules` | pricing-custom / hub |
| `synchronisation` | Centre sync |
| `import-export`, `historique`, `anomalies` | Backoffice v2 / hub |

**Gap** : certains mappings utilisent encore `studio=chips` ou `studio=variables` (hors `CatalogStudioId`). Le hub normalise, mais ces URLs sont obsolètes.

### 3.6 Legacy hors `/administration`

| Route | État |
|---|---|
| `/admin/pricing` | Encore chargé (`BackofficeWorkspaceSuspense`) — **conservé** |
| `/admin-control` | Redirect → `/admin/pricing` |
| `/admin` | Hub admin legacy |

---

## 4. Navigation & domaines

### Source de vérité

`components/admin/catalogue-prix-stock/CatalogStudioNav.tsx`

### 8 studios techniques / 5 visibles

| ID | Label | Visibilité | Canonicalise vers |
|---|---|---|---|
| `cockpit` | Vue d’ensemble | **Visible** | — |
| `matieres` | Matières, formats & coûts | **Visible** | — |
| `prix` | Studio Prix & Calculs | **Visible** | — |
| `excel` | Données & contrôle | **Visible** | — |
| `historique` | Historique | **Visible** | — |
| `articles` | Produits & disponibilité | Caché (alias) | `prix` |
| `finitions` | Finitions & règles | Caché (alias) | `prix` |
| `anomalies` | Diagnostics | Caché (alias) | `cockpit` |

### Defaults tabs

| Studio | Tab défaut |
|---|---|
| `cockpit` | `vue` |
| `prix` | `articles` |
| `finitions` | `chips` |
| `matieres` | `matieres` |
| `excel` | `excel` |
| `historique` | `historique` |
| `articles` | `articles` |
| `anomalies` | `anomalies` |

### Sous-nav Studio Prix (`PricingStudioNav.tsx`)

Visibles : Vue d’ensemble · Moteurs · Formules & règles · Tarifs par article · Paliers · Anomalies  

Deep-links masqués : `simulation` → overview · `versions` → overview

### Macro-nav Administration

Registres : `admin-macro-modules.ts`, `module-registry.ts`, `role-registry.ts`  
Beaucoup de modules catalogue/prix/matières sont `status: hidden` — navigation réelle = shell Administration + hub CPS.

---

## 5. Composants UI

### 5.1 Workspace principal

`components/administration/catalogue-prix-stock/CataloguePrixStockWorkspace.tsx`

- Normalisation URL `studio ↔ tab`
- Lazy-load des gros panneaux
- KPI Cockpit, sync POS, Excel
- Permissions UI `admin | manager | direction`

### 5.2 Dossier hub CPS

`components/admin/catalogue-prix-stock/` (28 fichiers TSX)

| Composant | Rôle |
|---|---|
| `AdminCatalogueShell` / `AdminHeader` | Chrome |
| `CatalogStudioNav` | Domaines |
| `CockpitStudio` / `CockpitNextActions` / `KpiCards` | Pilotage |
| `MaterialStockStudio` | Matières+stock |
| `PricingStudioNav` / `Overview` / `EnginesGallery` / `FormulasStudio` / `FamilyCards` | Prix |
| `ExcelManager` | Import/export |
| `AnomalyCenter` / `PosPublicationParityPanel` | Diagnostics |
| `OptionsDependenciesPanel` / `OptionsFinitionsHealthStrip` | Options |
| `SmartDataGrid` / `PillTabs` / `CpsStudioFrame` | Primitives UI |
| `EntityDrawer` / `ReapproExpressBar` / `StockStatusBadge` | Stock UX |

### 5.3 Fiche produit

| Fichier | Rôle |
|---|---|
| `pricing-v4/pricing-articles-workspace.tsx` | Shell liste+fiche |
| `pricing-v4/catalog/article-catalog-page.tsx` | Catalogue |
| `article-pricing-card.tsx` | Fiche tarifaire (sticky actions, OptionsChips embarqué, dirty/beforeunload) |
| `article-dense-list.tsx` / `article-compact-chip-grid.tsx` | Vues liste |

Sections fiche : infos · validation · formule · paliers · options & finitions · matières (lecture seule) · urgence · règles · anomalies

### 5.4 Options / chips

`components/backoffice-v2/options/`

- `OptionsChipsWorkspace` (global + embarqué fiche avec `lockedArticleId`)
- `ChipsDataTable`, `OptionsArticlesList`, sync badges, corbeille chips

### 5.5 Matières

Chaîne : `MaterialStockStudio` → `MaterialsUnifiedWorkspace` → `MaterialMasterDataTable` → `MasterDataVirtualTable`

Sous-vues : `referentiel` · `formats` · `couts` · `stock` · `usages` · `anomalies`

**Gap perf P1** : `MasterDataVirtualTable` fait `items.map` — **pas de vraie virtualisation** (>60 lignes = écart règle performance).

---

## 6. APIs

Convention : `app/api/<segments>/route.ts`  
Sous-arbre `admin-backoffice` : **~138** routes.

### 6.1 Catalogue & articles

| Endpoint | Méthodes | Notes |
|---|---|---|
| `/api/backoffice/articles` | GET, POST | Canonique legacy |
| `/api/backoffice/articles/[id]` | GET, PATCH, DELETE | |
| `/api/backoffice/articles/sync-catalogue` | POST | |
| `/api/admin-backoffice/articles` | GET | |
| `/api/admin-backoffice/articles/[id]/chips` | GET | |
| `/api/admin-backoffice/articles/sync-catalogue` | POST | |
| `/api/admin-backoffice/articles-price-table` | GET | |
| `/api/admin-backoffice/articles-price-table/[id]` | PATCH | |
| `/api/admin-backoffice/pos-catalog-index` | GET, POST | |
| `/api/admin-backoffice/catalogue-pos/import-excel` | POST | |
| `/api/admin/catalogue/cockpit` | GET | KPI cockpit |
| `/api/pos/catalogue` | GET | Consommation POS |
| `/api/pos/catalogue/[id]` | GET | |

### 6.2 Dynamic pricing

| Endpoint | Méthodes |
|---|---|
| `/api/dynamic-pricing` | GET, POST |
| `/api/dynamic-pricing/[articleId]` | GET, POST, PATCH |
| `/api/dynamic-pricing/compare` | GET, POST |
| `/api/admin-backoffice/pricing/articles` | GET |
| `/api/admin-backoffice/pricing/articles/[articleId]` | GET |
| `.../base-price` | GET, PATCH |
| `.../materials` | GET |
| `.../formula-audit` | GET |
| `.../diff-pos` | GET |
| `.../simulate` | POST |
| `/api/pricing/simulate` · `/calculate` · `/overview` · `/anomalies` | divers |
| `/api/global-pricing` | GET |
| `/api/price-store/resolve` | POST |

### 6.3 Publication & sync

| Endpoint | Permission typique | Rôle |
|---|---|---|
| `/api/admin-backoffice/pricing/sync-pos` | `config:publish` | Maintenance catalogue + sync catalog + matières |
| `/api/admin-backoffice/sync-pos` | `config:publish` | Alias |
| `/api/admin-backoffice/pricing/publish` | `config:publish` | Publication |
| `/api/admin-backoffice/pricing/publish-bulk` | `config:publish` | Bulk |
| `/api/admin-backoffice/sync-diagnostics` | lecture | Drift |
| `/api/admin/sync/run` | admin | Sync globale |
| `/api/admin-config/sync-catalog` · `publish` · `rollback` · `versions` | config | Versions config |

`pricing/sync-pos` orchestre :

1. `runPosCatalogueMaintenance({ force: true })`
2. `syncBackofficeCatalog()`
3. `syncPricingMaterialsToPos({ publish: true })`

### 6.4 Matières

| Famille | Endpoints (échantillon) |
|---|---|
| CRUD | `/admin-backoffice/materials`, `/materials/[id]`, archive, duplicate, usage |
| Lien stock | `/materials/[id]/link-stock`, `/stock`, `from-stock` |
| Qualité | `completeness`, `units`, `audit-pos`, `clean-merge` |
| Base prices | `/pricing/base-materials/**`, import, export-missing, bulk-delete, restore |
| Context prices | `/pricing/base-material-prices/**`, publish, publish-all, import-excel |

### 6.5 Options / chips / dépendances

- `/api/admin-backoffice/options/chips` · `chips/[chipId]`
- import-excel · dedupe-formats
- `/options/articles` · `articles/[id]/chips`
- `/option-dependencies`
- `/api/pos/article/[id]/option-overrides`

### 6.6 Stock

- `/api/stock` · `/api/stock/[id]`
- `/api/stock/items` · `items/[id]` · generate-sku · link/unlink-material
- `/api/stock/movements` · `/anomalies` · `/check`
- `/api/pos/stock-check`

### 6.7 Excel (pipelines)

Export/import : prix-matières-stock · articles · variables · chips · catalogue-pos · règles · vente directe · design · grand format · finishing · packaging · paliers

### 6.8 Règles spécialisées (échantillon)

`print-params` · `paper-formats` · `support-faces` · `material-rules` · `flyer-regles` · `carterie-regles` · `publications-regles` · `photo-*` · `photobook` · `tampons` · `carnet-autocopiant` · `event-rules` · `base-printing`

---

## 7. Services & lib

### Catalogue

| Fichier | Rôle |
|---|---|
| `lib/services/catalogue-service.ts` | `getPosCatalogue` (read-only) + `runPosCatalogueMaintenance` |
| `catalogue-sync-service.ts` | Sync |
| `catalogue-pos-builder.ts` | Construction payload POS |
| `catalogue-coverage.ts` | Couverture |
| `detect-catalog-duplicates.service.ts` | Doublons |
| `pos-catalog-index.service.ts` | Index |

### Sync

| Fichier | Rôle |
|---|---|
| `admin-to-commercial-sync.service.ts` | Orchestration Admin→Commercial→POS |
| `admin-data-sync.service.ts` | Données admin |
| `pricing-data-sync.service.ts` | Prix |
| `sync-drift-service.ts` | Drift (catalogue, profils, **paiements**) |
| `pricing-pos-sync.service.ts` | Projection POS |
| `material-stock-sync.service.ts` | Lien matière↔stock |
| `backoffice-sync.service.ts` | Backoffice |

### Pricing engines

`pricing-resolver` · `dynamic-engine` · `calculate` · `publish-dynamic-pricing` · `sync-dynamic-pricing` · `commercial-projection` · `publication-parity` · `material-context-price` · `stock-rule-engine` + moteurs familles (ISF, GF, flyers, carterie, textile, photo, packaging…)

### Stock

`stock-service` · `stock-quantity` · `StockAvailabilityService` · modules `stock.service` / repository / SKU / link / anomaly / validation

### Source de vérité réelle (hybride)

| Domaine | Source primaire | Fallback / legacy |
|---|---|---|
| Produit tarifaire | `ArticlePricingProfile` | `lib/data/catalogue.ts` |
| Formule | `FormulaVersion` published | — |
| Options | `ProductOptionGroup/Value` | — |
| Matière | `BaseMaterial` | `MaterialCatalog` |
| Prix contexte | `MaterialContextPrice` | — |
| Stock | `StockItem` + movements + reservations | — |
| Prix legacy | — | `SalePrice2026` |

---

## 8. Modèle de données Prisma

Fichier : `prisma/schema.prisma`

### Articles & pricing

- **`ArticlePricingProfile`** — clé `articleId`, statut draft/published/archived, relations options / paliers / urgence / matières / formules / stock rules
- **`ProductPricingProfile`** — modèle plus récent (dualité à surveiller)
- `ArticleTemplate` · `PriceFormula` · `BusinessRule` · `PricingVariable` · `FormulaVersion` · `DiscountTier` · `UrgencyRule` · `ConfigVersion`

### Options

- `ProductOptionGroup` · `ProductOptionValue` · `OptionDependency` · goodies deps/addons  
- Pas de modèle `OptionChip` canonique — chips = projection Group/Value

### Matières

- `BaseMaterial` (achat / vierge / imprimé, `stockItemId`, soft-delete)
- `MaterialContextPrice` · `MaterialPrice` · `BasePrintingPrice`
- Catalogues : `MaterialCatalog` · `GrammageCatalog` · `BlankMaterialPrice` · équivalences · limites formats
- `SalePrice2026` · `PriceHistory` · `SupplierPrice`

### Stock (modèles Prisma)

- **`StockItem`** : quantity, reservedQty, minQty, costs, liens matière
- **`StockMovement`** : entrée/sortie/ajustement/réservation/retour/perte/vente/production/transfert/annulation
- **`StockReservation`** : active / released / consumed · lien commande/devis

### Règles spécialisées

PaperFormat · SupportFace · ThickPaper · PrintTechnology · ServicePriceEquivalence · CarnetAutocopiant · Stamp · Photobook · TiragePhoto · CadrePhoto · PhotoFormat · ArticlePromotional · EventAccessory…

---

## 9. Flux métier

### 9.1 Brouillon → Actif

```text
Création profil/formule (draft)
  → Validation admin
  → FormulaVersion.status = published / profil Activer
  → Projection commerciale
  → Sync POS
  → Invalidation cache / index
  → Audit + diagnostics
```

Vocabulaire UI (ADMIN_UI) : **Activer** / **Archiver** / **À corriger** — plus « Publier/Dépublier » visibles.

### 9.2 Admin → Commercial → POS

```text
Admin configure
  → Prisma
  → runPosCatalogueMaintenance (explicite)
  → syncBackofficeCatalog + syncPricingMaterialsToPos
  → admin-to-commercial-sync (profils, options, deps, VD, index, drifts)
  → POS / Devis consomment pricingResolver
```

Le hub n’affiche « Synchronisé » que si **catalogue ET matières** réussissent.

### 9.3 Stock

| Opération | Effet |
|---|---|
| `reserveStock` | +reservedQty · mouvement reservation |
| `releaseStockReservation` | −reservedQty · released (idempotent) |
| `consumeStockReservation` | −quantity · −reservedQty · consumed · mouvement production |
| `consumeReservationsForCommande` | Fin production commande |

### 9.4 Drift / anomalies

`sync-drift-service` : config↔statique↔profils DB · orphelins · **payment drift**

- anomalies pricing
- matières sans prix
- non liées stock
- écarts Admin↔POS
- formules cassées
- doublons
- options incohérentes

---

## 10. Permissions & RBAC

| Action | Permission typique |
|---|---|
| Lecture config / anomalies | `config:view` ou `tarifs:read` |
| Édition prix / matières | `tarifs:write` |
| Publication / sync POS | `config:publish` |
| Ops sensibles (merge, migration) | `requireAdmin()` |

**Gap P1** : hétérogénéité `withAuthApi` / `requirePermission` / réexports — matrice endpoint-par-endpoint encore nécessaire (`docs/audit/MATRICE_RBAC_API_VAGUE_2.md`).

UI hub : édition limitée aux rôles `admin | manager | direction`.

---

## 11. Tests & couverture

| Fichier test | Ce qu’il prouve |
|---|---|
| `tests/admin-ux-chrome.test.ts` | 5 domaines · vocabulaire · radius 7px · sticky actions fiche · a11y basique |
| `tests/catalogue-pos-refonte-sprint1.test.ts` | Alias produits/chips sous Prix · redirect catalogue-pos · OptionsChips embarqué |
| `tests/catalogue-prix-stock-ia-integration.test.ts` | Nav 5 · absorption · colonnes matières · MaterialStockStudio |
| `tests/prix-regles-sans-pos.test.ts` | Vocabulaire sans « Options POS » · matières read-only · modal |
| `tests/vf-qa01-behavioral.test.ts` | Fiscal · stock invariants · virtualisation pure · catalogue read-only · guards deploy |
| `tests/v2-ux-harmonize.test.ts` | Tokens radius |

**Faiblesse** : beaucoup d’assertions sont des scans source (`readFileSync` + regex) — utiles pour non-régression structurelle, insuffisants seuls pour prouver le runtime.

---

## 12. Bugs, gaps, risques (P0–P2)

### P0 — Bloquants / critiques

| ID | Description | État |
|---|---|---|
| D-01 | Backup PG restaurable manquant | **Ouvert** — NO-GO prod |
| D-02 | Drift Prisma sqlite→postgres | **Ouvert** — patch build only |
| D-03 | Formules custom perdues sans backup | **Ouvert** |
| M-02 | Payment drift live (acompte/reste ≠ ledger) | **Ouvert** — repair bloqué sans backup |
| B-01 | ANS Talk upload sans attachment IDs | Connu (hors CPS strict) |
| B-02 | Création groupe Talk → conv undefined | Connu |

### P1 — Haute priorité CPS

| ID | Description |
|---|---|
| S-01 | Sync Admin→POS non atomique multi-entités |
| S-02 | Dualités `ArticlePricingProfile` / `ProductPricingProfile` |
| S-03 | Excel matières multi-feuilles non transactionnel |
| S-04 | Preview/import Excel non uniformisé |
| S-05 | Scénarios contractuels Admin=POS=panier incomplets |
| S-06 | Migration grilles SF/PLV → `BasePrintingPrice` incomplète |
| S-07 | Permissions API hétérogènes |
| S-08 | E2E staging Admin→Commercial→POS non exécuté |
| S-09 | `MasterDataVirtualTable` non virtualisée (perf) |
| S-10 | Historique fournisseur / prix achat peu visible |
| S-11 | URLs `backoffice-redirects` avec `studio=chips/variables` obsolètes |

### P2 — Dette / polish

| ID | Description |
|---|---|
| T-01 | Fallback `prixDepart` catalogue legacy |
| T-02 | Version tarifaire peu visible dans panier |
| T-03 | Pages familles spécialisées encore dispersées |
| T-04 | Liens `/admin/pricing` encore présents |
| T-05 | Composants Simulation/Versions conservés mais hors nav |
| T-06 | Docs « 6 domaines » obsolètes vs code « 5 domaines » |

---

## 13. Incohérences documentation

| Source | Dit | Réalité code/tests |
|---|---|---|
| Audits 15/07 « Ultra-Prompt » | 6 domaines visibles | **5** visibles |
| Commentaires workspace (`domaine 6`) | Données = domaine 6 | Historique est un 5ᵉ domaine visible séparé |
| Ancien commentaire CatalogStudioNav | anomalies → Données | `canonicalizeStudio` → **cockpit** |
| `Modules_MAP` / menus | liens Catalogue/Prix/Matières séparés | Modules souvent `hidden` → hub CPS |

**Source de vérité navigation** = `CatalogStudioNav.tsx` + tests `admin-ux-chrome` / `catalogue-prix-stock-ia-integration`.

---

## 14. Checklist A→Z de validation

### A. Accès & shell

- [ ] Login rôle admin/manager/direction
- [ ] Menu Administration → hub Catalogue Prix Stock
- [ ] 5 domaines visibles uniquement
- [ ] Deep-links `studio=` / `tab=` / `article=` / `sheet=`

### B. Cockpit

- [ ] KPI articles / options / matières / anomalies chargés
- [ ] File des priorités cliquable
- [ ] Anomalies accessibles depuis cockpit

### C. Matières

- [ ] 6 sous-vues référentiel→anomalies
- [ ] Création / édition / archive / restore
- [ ] Lien / délien stock
- [ ] Completeness & prix manquants
- [ ] Export missing prices Excel

### D. Studio Prix

- [ ] Liste dense articles (défaut)
- [ ] Fiche : infos, paliers, formule, options, urgence
- [ ] Sticky actions « Modifier le prix »
- [ ] OptionsChips embarqué + lien Options & finitions
- [ ] Matières en lecture seule + lien studio Matières
- [ ] Activer / Archiver
- [ ] Garde beforeunload si dirty

### E. Options & finitions

- [ ] Bibliothèque chips (`tab=chips`)
- [ ] Finitions & façonnage
- [ ] Dépendances SI/ALORS
- [ ] Import Excel chips

### F. Données & contrôle

- [ ] Import / export Excel
- [ ] Diagnostics / anomalies
- [ ] Corbeille matières
- [ ] Historique / audit

### G. Sync

- [ ] Bouton Sync POS (permission `config:publish`)
- [ ] Diagnostic drift
- [ ] Parité Admin↔POS sur 3 articles témoins
- [ ] Simulation prix = prix panier POS

### H. Stock

- [ ] Quantité / réservé cohérents
- [ ] Réservation commande
- [ ] Consommation fin production
- [ ] Libération annulation

### I. Alias legacy

- [ ] `/administration/catalogue-pos`
- [ ] `/administration/matieres`
- [ ] `/admin/pricing` (toujours accessible, non cassé)

### J. Build & tests

- [ ] `npx tsc --noEmit`
- [ ] `npm run test` (suites CPS + vf-qa01)
- [ ] `npx next build`
- [ ] Recette manuelle 320–1440 px

---

## 15. Plan de priorisation

### Immédiat (avant toute prod)

1. Fournir + tester restore dump PostgreSQL (D-01)
2. Trancher payment drift (backup + outil repair) (M-02)
3. Valider alignement schéma PG (D-02)

### Vague correctifs CPS (après backup)

1. Sync atomique multi-entités (S-01)
2. Virtualiser `MasterDataVirtualTable` (S-09)
3. Uniformiser Excel preview/import (S-03/S-04)
4. Matrice RBAC API complète (S-07)
5. Nettoyer redirects `studio=chips/variables` (S-11)
6. Documenter / fusionner dualité profils pricing (S-02)

### Stabilisation

1. E2E Admin→Commercial→POS isolé (S-08)
2. Mettre à jour docs « 6 domaines » → « 5 domaines »
3. Budgets perf p50/p95 sur listes matières/articles

---

## 16. Annexes — docs de référence

### Canoniques

- `docs/BACKOFFICE_FLOW.md`
- `docs/SYNC_MATRIX.md`
- `docs/MODULES_MAP.md`
- `docs/FLOW_GLOBAL.md`
- `docs/USER_JOURNEYS.md`

### Audits CPS

- `docs/AUDIT_RECONSTRUCTION_ADMIN_CATALOGUE_MATIERES_PRIX_SYNC_POS.md`
- `docs/AUDIT_REFONTE_CATALOGUE_POS.md`
- `docs/AUDIT_REFONTE_PRIX_REGLES_ADMIN.md`
- `docs/AUDIT_REFONTE_FORMULES_REGLES_STUDIO_PRIX.md`
- `docs/AUDIT_REFONTE_CATALOGUE_PRIX_STOCK_IA.md`
- `docs/AUDIT_COMPLETION_MATIERES_FORMATS_STOCK.md`
- `docs/PRICING_CUSTOM_ARTICLES_FULL_AUDIT.md`

### Options / stock / sync

- `docs/OPTIONS_CHIPS_DATA_MAPPING.md`
- `docs/STOCK_MATERIALS_BACKOFFICE_SYNC.md`
- `docs/MATERIALS_POS_SYNC_MAPPING.md`
- `docs/audit/REGISTRE_INVARIANTS_STOCK_PRODUCTION.md`
- `docs/audit/RECETTE_SYNC_ADMIN_COMMERCIAL_POS_VAGUE_2.md`
- `docs/audit/MATRICE_SYNCHRONISATION_DONNEES.md`
- `docs/audit/MATRICE_RBAC_API_VAGUE_2.md`
- `docs/audit/AUDIT_BUGS_ANOMALIES_ETAPES.md`
- `docs/audit/RAPPORT_RELEASE_CANDIDATE.md`
- `docs/audit/DECISIONS_EN_ATTENTE.md`

### Transverses audit-10-10

- `docs/audit-10-10/06_POS_PRICING_AUDIT.md`
- `docs/audit-10-10/07_STOCK_ACHATS_FOURNISSEURS_AUDIT.md`
- `docs/audit-10-10/08_BACKOFFICE_ADMIN_AUDIT.md`
- `docs/audit-10-10/09_SYNC_DATA_FLOW_AUDIT.md`

---

## Historique de ce document

| Date | Auteur | Note |
|---|---|---|
| 2026-07-19 | Audit agent Cursor | Inventaire A→Z exhaustif hub CPS + pages + APIs + Prisma + gaps |
| 2026-07-19 | Refonte agent | Vague P0+ : faux brouillons matières corrigés, soft-delete, import sans replaceAll implicite, liaison stock transactionnelle, contrats pricing alignés, marge `coût/(1-taux)`, blocs visuels exécutés, parité sans faux « Synchronisé », Activer ≠ Sync POS |

### Corrections appliquées (vague sécurisation)

- Matières : édition → `draft` réel ; DELETE = archive ; import UI `replaceAll: false` ; archive replaceAll uniquement après succès sans erreur ; liaisons stock atomiques.
- Studio Prix : Zod accepte `priceModifier` / `surchargePercent` / `prixM2` ; toolbar Brouillon / Activer / Synchroniser POS séparés ; `unpublish` archive les versions ; parité exige contrôle drift.
- Paliers : détection trous et doublons.
- UX : marge réelle + prix conseillé sur colonne prix matières ; densité compacte/confortable (localStorage UI uniquement).

### Risques restants (NO-GO production)

- Sync multi-entités non atomique.
- Backup PostgreSQL restaurable manquant.
- Dualité `ArticlePricingProfile` / `ProductPricingProfile`.
- Fallback `SalePrice2026` encore consommable.
- Versionnement profil/paliers/options non snapshoté (hors formule).

---

*Fichier téléchargeable — chemin projet :*  
`docs/audit/AUDIT_COMPLET_ADMINISTRATION_CATALOGUE_PRIX_STOCK_A_Z.md`
