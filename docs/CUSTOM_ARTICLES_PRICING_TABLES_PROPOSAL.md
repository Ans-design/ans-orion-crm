# Proposition tableaux — Prix articles personnalisés

Référence UI : onglet **Prix & Calculs** (`?tab=pricing-custom`)

## Mode Par article

| # | Tableau | Statut MVP |
|---|---------|------------|
| 1 | Résumé article & mode calcul | ✅ `PricingArticleSummaryTable` |
| 2 | Variables impact prix | ✅ `PricingVariablesTable` |
| 3 | Variables sans impact (indicatif) | ✅ `PricingVariablesTable` |
| 4 | Matrice prix par variables | 🔜 Phase 2 (édition inline) |
| 5 | Formule de calcul | ✅ via `ArticlePricingCard` section formule |
| 6 | Paliers / remises | ✅ via `ArticlePricingCard` + onglet Paliers dédié |
| 7 | Règles métier | 🔜 Phase 2 |
| 8 | Simulation prix réel | ✅ via `ArticlePricingCard` section sim |
| 9 | Diff Backoffice vs POS | ✅ `PricingDiffTable` |

## Mode Vue globale

| # | Tableau | Statut MVP |
|---|---------|------------|
| G1 | Articles & statut prix | ✅ tableau global workspace |
| G2 | Variables impact prix | 🔜 API `GET .../pricing/variables?impact=price` |
| G3 | Variables sans impact | 🔜 `?impact=indicative` |
| G4 | Formules | 🔜 export global |
| G5 | Anomalies prix | ✅ onglet Anomalies existant |

## Navigation URL

```
/administration/backoffice?tab=pricing-custom&article=evt-affiche&view=by-article
```
