# Recette sync Admin / Commercial / POS — Vague 2 (V2-04)

| Date | 2026-07-19 (maj VF) |
|------|---------------------|
| Base isolée pour E2E complet | **NON EXÉCUTÉ** (pas de mutation / backup manquant) |
| Statut | Contrat documenté + **E2E lecture** `e2e/admin-pos-sync.spec.ts` |
| VF-P0B | Lecture POS **sans** merges ; maintenance via `POST .../pricing/sync-pos` + `adminToCommercialSync` |
| Préflight staging | `npm run staging:preflight` (tsc + security-headers ; health si `SITE_URL`) |

## 1. Source de vérité par champ

| Champ | Source officielle | Modèle | Écriture | Lecture POS |
|-------|-------------------|--------|----------|-------------|
| Réf. article | Admin pricing | `ArticlePricingProfile.articleId` | admin-backoffice | catalogue published |
| Libellé | Admin | profile / catalogue | admin | POS |
| Prix base / m² | Admin published | profile + FormulaVersion | publish | `loadPosDynamicContext` |
| Paliers | Admin | `DiscountTier` active | admin | dynamic engine |
| Options | Admin option groups | `ProductOptionGroup` | admin | `visiblePos` only |
| Matières | `BaseMaterial` | materials | admin | prix publiés |
| Stock dispo | StockItem | stock | stock module | check/réservation |
| Snapshot vente | DevisLigne / Commande | configSnapshot | cart/devis | figé |

Duplication acceptable uniquement en **projection** ou **snapshot** réconciliable.

## 2. Publication

1. Brouillon → validation complétude  
2. Publish (transaction)  
3. POS lit **published** seulement  
4. Drift : `sync-drift-service` / Centre sync Backoffice  

Ne pas considérer « publié » si Admin a sauvegardé mais POS n’a pas la version complète.

## 3. Parcours à tester (base jetable — futur)

1. Créer article Admin  
2. Prix + options + matière  
3. Publier  
4. Visible Commercial + POS  
5. Comparer ref/nom/catégorie/unité/prix  
6. Modifier + republier  
7. Panier + devis → snapshot  
8. Archiver → absent nouvelles ventes, historique conservé  

**Exécution réelle :** bloquée sans base isolée + backup (D-004).

## 4. Colonnes UI cibles

Admin / Commercial : référence, article, catégorie, état, prix publié, unité, stock si pertinent, maj, source, anomalies.

## 5. Tests existants liés

- `tests/pos-server-pricing-sync.test.ts`
- `tests/catalogue-prix-stock-ia-integration.test.ts`
- Lot 3 / V2 pricing canonical
- **E2E lecture** : `e2e/admin-pos-sync.spec.ts` — diagnostics sync/drift, catalogue POS, overlap soft backoffice↔POS, page `/administration/synchronisation`
- Health staging : `scripts/hostinger-healthcheck.ts` (+ `/api/health/ready`) · `npm run staging:preflight`
