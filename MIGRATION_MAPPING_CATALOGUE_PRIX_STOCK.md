# Mapping migration Catalogue Prix & Stock

## Principe

UI-only d’abord : les tables Prisma et services prix restent. Les studios ne sont que des **vues / shells** branchées sur les APIs existantes.

## Ancien → Nouveau

| Ancien | Nouveau |
|--------|---------|
| PillTabs CPS (19) | Nav secondaire 8 studios |
| `PrixMatieresStockWorkspace` non-embedded double barre | Toujours `embedded` dans studio Matières / Prix |
| Pages standalone `/administration/flyer-regles` etc. | Conservées + accès depuis cartes famille Prix |
| `/administration/packaging*` | Liens dans Prix & Calculs → Packaging |
| `/administration/matieres` | Alias / deep-link studio `matieres` |
| KPI `—` | API `GET /api/admin/catalogue/cockpit` |

## APIs nouvelles (façades)

| API | Branche vers |
|-----|----------------|
| `GET /api/admin/catalogue/cockpit` | `pos-catalog-index` + base-prix anomalies + materials counts |
| (plus tard) materials / articles / pricing/test | services existants |

## Rollback

Revenir à `?tab=` (toujours supporté). Studios = alias de tabs.
