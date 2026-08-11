# Audit suppression / archivage Backoffice legacy

## Composants anciens (UI dispersée)

| Composant | Statut | Action |
|-----------|--------|--------|
| `pricing-v4/backoffice-workspace.tsx` | Legacy | Conservé pour `/admin/pricing` ; sections admin redirigées |
| `pricing-v4/pricing-admin-shell.tsx` | Legacy | Plus utilisé pour routes `/administration/*` principales |
| `backoffice/BackofficeCatalogShell.tsx` | V1 intermédiaire | Remplacé par `backoffice-v2/AdminBackofficeShell` |
| `article-pricing-card.tsx` | **Conservé** | Fiche article détail (réutilisé v2) |
| `pricing-v4/catalog/*` | **Conservé** | Mode cartes articles |
| `pricing-v4/panels/*` | **Conservé** | Onglets chips, sync, anomalies, etc. |

## Pages

| Route | Avant | Après |
|-------|-------|-------|
| `/administration/backoffice` | Workspace v1 | **Page dédiée v2** |
| `/administration/articles` | Workspace onglets | → `?tab=articles` |
| `/administration/prix` | Workspace | → `?tab=articles&view=price-table` |
| `/admin/pricing?tab=` | Legacy query | Conservé (alias) |

## APIs conservées

- `/api/backoffice/*`, `/api/admin-config/*`, `/api/dynamic-pricing/*`, `/api/pricing/*`

## APIs nouvelles v2

- `/api/admin-backoffice/overview`
- `/api/admin-backoffice/articles-price-table`
- (+ aliases publish, sync, anomalies, audit, simulate)

## Données — jamais supprimées

- `ArticlePricingProfile`, `ProductOptionGroup`, `SalePrice2026`, `ConfigVersion`, etc.

## Risques

- Onglets chips/variables dépendent encore de `useBackofficeConfig` (draft admin)
- Bulk actions tableau prix : phase suivante
- Legacy workspace encore présent pour `/admin/pricing`

## Date

2026-07-05
