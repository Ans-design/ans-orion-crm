# Backoffice — Audit avant refonte totale

## Ancienne organisation

- **25 sections** `/administration/:section` via une route dynamique unique
- Shell `BackofficeWorkspace` + onglets `PricingAdminShell` (santé, articles, matières, prix, variables, anomalies…)
- Catalogue articles : `ArticleCatalogPage` (liste + détail) sous onglet « Articles »
- Fiche article : `ArticlePricingCard` avec 12 sous-sections internes
- Données : `ArticlePricingProfile` (Prisma) + catalogue statique TS (`lib/data/catalogue.ts`)
- Publication : `/api/admin-config/publish`
- Sync catalogue → DB : `/api/backoffice/articles/sync-catalogue`

## Problèmes identifiés

| Problème | Impact |
|----------|--------|
| Navigation dispersée (vue-ensemble, articles, prix, variables, sync séparés) | Perte de temps admin |
| Fiche article noyée dans onglet global | Contexte perdu |
| Impact prix / descriptif peu visible | Erreurs tarifaires |
| Statut sync POS éloigné de l’édition | Confusion publication |
| Anomalies dans onglet séparé | Correction lente |
| Pas de route `/administration/backoffice` dédiée | Alias vers vue-ensemble |

## Ce qui fonctionnait déjà (conservé)

- Moteur prix `resolvePrice` + dynamic pricing publié
- `scanPricingAnomalies`, sync drift, centre sync
- Snapshots devis/commande (non modifiés)
- Zéro suppression de routes legacy

## Date audit

2026-07-05
