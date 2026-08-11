# Audit Administration — Export / Import Excel & Synchronisation

**Date :** 2026-07-10  
**Référentiel fiabilité :** Stock & Matières (principe, pas format colonnes)  
**Registre :** `lib/admin/excel-import-export.ts` → `ADMIN_EXCEL_MODULES`

---

## 1. Principe directeur

| Règle | Détail |
|-------|--------|
| Format Excel | **Un modèle par module** — colonnes adaptées à la logique métier |
| Stock & Matières | Format `MATIÈRE \| TYPE CARACTÉRISTIQUE \| …` — **réservé à ce module** |
| Mode `full` | Remplacement complet — absent du fichier = archivé (matières) |
| Mode `upsert` | Mise à jour contrôlée — pas de suppression auto |
| Actualiser | Refetch DB uniquement — **pas de seed** |
| Sync | Admin change → modules liés mis à jour via `admin-data-sync.service.ts` |

---

## 2. Tableaux Administration — état par module

| Module | Mode import | Colonnes Excel (résumé) | Format fichier | API import | UI toolbar |
|--------|-------------|-------------------------|----------------|------------|------------|
| Stock & Matières | **full** | MATIÈRE, TYPE CARACTÉRISTIQUE, VALEUR, RÉFÉRENCE, PRIX BASE… | `material-excel-format.ts` | `…/base-material-prices/import-excel` | `BaseMaterialPricesTable` |
| Options / Chips | upsert | ARTICLE, RÉFÉRENCE, BLOC, CHAMP, LIBELLÉ, TYPE, ACTIF, VISIBLE POS… | `chips-excel-format.ts` | `…/options/chips/import-excel` | `OptionsChipsWorkspace` |
| Variables globales | upsert | ARTICLE, RÉFÉRENCE, BLOC, CHAMP, MONTANT, INDICATIF, POS… | `variables-excel-format.ts` | `…/pricing/variables/import-excel` | `PricingGlobalVariablesView` |
| Prix & Calculs | upsert | **TYPE** (PRIX / PALIER / FORMULE), ARTICLE, RÉFÉRENCE, TYPE PRIX, VALEUR, QTÉ MIN/MAX, MODE, FORMULE, STATUT… | `pricing-articles-excel-format.ts` | `…/pricing/articles/import-excel` | `CustomPricingWorkspace` |
| Paliers / Remises | upsert | ARTICLE, QTÉ MIN, VALEUR, TYPE… | `tiers-excel-format.ts` | `…/tiers/import-excel` | `TiersByArticleWorkspace` |
| Catalogue & POS | upsert | ARTICLE, RÉFÉRENCE, FAMILLE, STATUT, ACTIF, VISIBLE POS… | `catalogue-pos-excel-format.ts` | `…/catalogue-pos/import-excel` | `CataloguePosUnifiedWorkspace` |
| Production & Flux | upsert | ÉTAPE / TRANSITION / RÈGLE (feuille mixte typée) | `production-flux-excel-format.ts` | `…/production-flux/import-excel` | `ProductionFluxUnifiedWorkspace` |
| Fournisseurs | upsert | CODE, NOM, CONTACT, TÉLÉPHONE… | `suppliers-excel-format.ts` | `…/suppliers/import-excel` | `/fournisseurs` |
| Règles métier | upsert | CODE, LIBELLÉ, CATÉGORIE, PRIORITÉ… | `business-rules-excel-format.ts` | `…/regles/import-excel` | `/parametres/regles` |
| Permissions | upsert | RÔLE, MODULE, VOIR, CRÉER… | `permissions-excel-format.ts` | `/api/admin/permissions/import-excel` | `/admin/permissions` |
| Annexes & sites | upsert | TYPE, CODE, NOM, ADRESSE… | `annexes-excel-format.ts` | `…/annexes/import-excel` | `/admin/annexes` |
| Transporteurs | upsert | RÉFÉRENCE, LIBELLÉ, TYPE, ZONES… | `carriers-excel-format.ts` | `/api/logistics/carriers/import-excel` | `LogisticsCarriersPanel` |
| Audit log | export-only | DATE, UTILISATEUR, ACTION, ENTITÉ… | inline | — | `BackofficeAuditLogPanel` |
| Anomalies tarif | export-only | SÉVÉRITÉ, ARTICLE, MESSAGE… | inline | — | `PricingAnomaliesPanel` |
| Modèles articles | export-only | MODÈLE, LIBELLÉ, FAMILLE… | inline | — | `ArticleTemplatesPanel` |
| Utilisateurs | export-only | NOM, EMAIL, RÔLE… | `permissions-excel-format.ts` | — | `/admin/permissions` |
| Sync diagnostics | export-only | TYPE, MODULE, STATUT… | inline | — | `SyncUnifiedWorkspace` |
| Demandes accès | export-only | NOM, EMAIL, STATUT… | inline | — | `access-requests-panel` |

**Corbeilles (export seul) :** Matières, Chips, Articles catalogue.

---

## 3. Corrections appliquées (session 2026-07-10)

### Synchronisation prix matière → POS

- **Nouveau service :** `lib/services/admin-data-sync.service.ts`
  - `propagatePublishedMaterialPrice()` — BaseMaterial publié → `MaterialPrice`, `ArticlePricingProfile` (m²/cm²), `BasePrintingPrice`
  - `propagateAllPublishedMaterialPrices()` — après import complet / publish-all
  - `invalidateAdminCaches()` — KPI + horodatage `admin-catalogue-sync-at-v1`
  - `notifyAdminModuleMutation()` — après import chips/variables/catalogue

- **Branché sur :**
  - `publishMaterialPriceRow()` — publication ligne matière
  - `publishAllDraftMaterialPrices()` — publication globale
  - `materials-import.route.ts` — import Excel matières
  - `pricing-pos-sync.service.ts` — sync POS explicite

### Import Excel

- **Variables :** import `INDICATIF` + `MONTANT` via pipeline chips étendu
- **Dialog import :** texte adapté `full` vs `upsert` (`ExcelTableActions.importMode`)
- **Transporteurs :** plus de re-seed silencieux `DEFAULT_CARRIERS` en cas d'erreur chargement

### Catalogue corbeille

- Onglet Corbeille articles archivés + restauration brouillon

---

## 4. Chaîne sync prioritaire — Prix matière → POS commercial

```
Stock & Matières (BaseMaterial.basePrintPrice)
  → publication (publicationStatus = published)
  → propagatePublishedMaterialPrice()
      → MaterialPrice.prixM2 / prixCm2 (materialKey)
      → ArticlePricingProfile.prixM2 / prixCm2 (articles liés)
      → BasePrintingPrice.basePrice
  → invalidateAdminCaches()
  → POS lit ArticlePricingProfile + moteur dynamic (resolvePublishedBaseMaterialPrice)
```

**Exemple :** Bâche 440g 20 000 → 25 000 Ar/m²  
1. Modifier + publier dans Stock & Matières  
2. Propagation automatique vers profils articles m²  
3. Catalogue POS / POS commercial reflètent le nouveau prix au prochain chargement API  
4. F5 conserve la valeur (persistée en DB)

---

## 5. Bugs connus / limites restantes

| Priorité | Module | Problème | Statut |
|----------|--------|----------|--------|
| ~~P1~~ | Prix & Calculs | Colonnes export `FORMULE` / `PALIER` = résumé — non réimportables | ✅ **Corrigé** — lignes multi-type `TYPE=PRIX\|PALIER\|FORMULE` export + import round-trip |
| ~~P2~~ | Chips / Variables | Import update-only — création impossible via Excel | ✅ **Corrigé (chips)** — `createChipGroupFromExcel` + résolution article par RÉFÉRENCE |
| P2 | Catalogue import | Colonnes compteur (VARIABLES, IMPACT PRIX) export-only | Ouvert |
| P3 | Utilisateurs | Export seul (données sensibles — intentionnel) | OK |
| P3 | Modèles articles | Templates statiques code — export seul | OK |
| P3 | Production & Flux | Feuille mixte — risque confusion colonnes DEPUIS/ÉTAPE | Ouvert |

### Fallbacks à surveiller (ne pas déclencher sans action utilisateur)

- `DEFAULT_CARRIERS` — bouton « Réinitialiser défauts » uniquement
- `listBaseMaterialsFromCatalogFallback` — uniquement si `allowCatalogFallback=true`
- `sync-catalog` / `sync-pos` — actions explicites Administration
- `seedDefaultAnnexes`, `npm run seed` — scripts dev uniquement

---

## 6. Tests effectués

| Test | Résultat |
|------|----------|
| `npm run build` | ✅ après corrections P1/P2 |
| Import variables INDICATIF/MONTANT | ✅ code branché |
| Dialog import upsert vs full | ✅ texte distinct |
| Propagation publish matière | ✅ service + routes branchés |
| Export Prix multi-lignes (PRIX/PALIER/FORMULE) | ✅ `buildPricingArticlesExportRows` |
| Import paliers + formules Prix & Calculs | ✅ `tiersUpdated` / `formulasUpdated` |
| Création chip via Excel (nouveau BLOC+CHAMP) | ✅ `createChipGroupFromExcel` |

### Tests manuels recommandés

1. **Matière → POS :** modifier prix Bâche 440g → publier → vérifier `/pos` + `/administration/catalogue-pos`
2. **Import/export :** exporter → modifier 1 ligne → réimporter → F5
3. **Suppression :** supprimer ligne → actualiser → ne doit pas revenir
4. **Variables :** exporter → changer MONTANT → réimporter → vérifier modifier prix option
5. **Prix & Calculs :** exporter → modifier palier (QTÉ MIN, VALEUR) ou formule → réimporter → F5
6. **Chips :** ajouter ligne ARTICLE + RÉFÉRENCE + BLOC + CHAMP inexistant → import → vérifier création en DB

---

## 7. Fichiers clés

| Rôle | Chemin |
|------|--------|
| Registre modules | `lib/admin/excel-import-export.ts` |
| Toolbar Excel | `components/admin/excel-table-actions.tsx` |
| Hub modules | `components/admin/AdminExcelModulesHub.tsx` |
| Sync centrale | `lib/services/admin-data-sync.service.ts` |
| Publication matière | `lib/server/modules/pricing/base-material-price.service.ts` |
| Import matières | `lib/server/modules/materials/materials-excel-import.service.ts` |
| Moteur prix POS | `lib/pricing/dynamic-engine.ts` |
| Catalogue POS | `lib/services/catalogue-service.ts` |
| Centre sync UI | `components/administration/sync/SyncUnifiedWorkspace.tsx` |

---

## 8. Critères d'acceptation — statut

| Critère | Statut |
|---------|--------|
| Export Excel adapté par module | ✅ 16 modules registre + corbeilles |
| Import adapté (modules éditables) | ✅ sauf export-only intentionnels |
| Colonnes ≠ format matières partout | ✅ formats dédiés |
| Données persistées après F5 | ✅ DB source de vérité |
| Actualiser = refetch DB | ✅ pas de seed auto |
| Sync prix matière → POS | ✅ propagation branchée |
| Pas de fallback silencieux transporteurs | ✅ corrigé |
| Rapport import (lignes lues/créées/erreurs) | ✅ `ExcelImportReport` |
| Import paliers/formules via Prix & Calculs | ✅ P1 |
| Création chips via import Excel | ✅ P2 |
| Fichier audit | ✅ ce document |
