# AUDIT refonte totale — Catalogue Prix & Stock (Admin)

## Verdict

Refonte **UI / navigation** livrée pour le hub Catalogue Prix & Stock : 8 studios, cockpit KPI réels, cartes familles de calcul. **Aucune formule prix** (`lib/pricing/*`, `lib/packaging/*`) n’a été altérée. Tests `tests/pricing-regression.test.ts` : **6/6 verts**.

## Livré

1. `CatalogStudioNav` — Cockpit, Articles, Matières, Prix, Finitions, Excel, Anomalies, Historique
2. `CataloguePrixStockWorkspace` — résout `studio` + `tab`, sous-onglets par studio
3. `GET /api/admin/catalogue/cockpit` — comptes DB (articles POS index, matières, prix manquants, stock bas, finitions)
4. `PricingFamilyCards` — accès ISF, flyers, carterie, GF, AVD, packaging…
5. Docs phase 0 : `AUDIT_AVANT_REFONTE_*`, `CATALOGUE_ADMIN_REFACTOR_PLAN.md`, `MIGRATION_MAPPING_*`, `PRICING_REGRESSION_SNAPSHOT.md`

## Garde-fous respectés

- Zéro suppression de routes métier
- Pas d’auto-seed post-delete
- Sync POS = appel API réel
- KPI ne restent pas à « — » si l’API cockpit répond

## Suite recommandée

1. Unifier fiche Articles (3 colonnes) sans casser CataloguePosUnifiedWorkspace
2. AnomalyCenter : workflows merge plus visibles
3. Historique : brancher `AdminCatalogAudit` si table existante
4. Smoke POS 3020 après prochaine sync catalogue
