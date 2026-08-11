# ANS ORION — API (référence condensée)

Base : `/api`. Auth via session NextAuth sauf endpoints marqués *public*.

## Santé (*public*)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/health` | Status app |
| GET | `/health/db` | Probe DB |

## Admin / Backoffice

| Méthode | Route | Auth |
|---------|-------|------|
| GET | `/admin/system-status` | admin |
| GET | `/admin/sync-status` | admin/manager |
| GET | `/admin/audit-logs` | admin |
| GET/POST | `/backoffice/articles` | view / admin |
| GET/PATCH/DELETE | `/backoffice/articles/[id]` | view / admin |
| GET | `/backoffice/article-templates` | config:view |
| GET | `/backoffice/workflows` | config:view |
| GET | `/backoffice/sync-diagnostics` | config:view |
| GET/POST | `/admin-config` | config:view |
| POST | `/admin-config/import` | admin |
| GET | `/admin-config/export` | admin |

## POS

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/pos/catalogue` | Liste articles actifs |
| GET | `/pos/catalogue/[id]` | Détail article |
| GET | `/pos/article/[id]/config` | Alias config POS |
| POST | `/pos/price-preview` | Calcul prix |
| POST | `/pos/pricing` | Alias price-preview |
| POST | `/pos/stock-check` | Vérif stock avant panier |

## Pricing

| Méthode | Route |
|---------|-------|
| GET | `/pricing/overview` |
| POST | `/pricing/simulate` |
| GET | `/pricing/anomalies` |
| GET/POST | `/dynamic-pricing` |
| GET/PATCH | `/dynamic-pricing/[articleId]` |

## Commercial

| Méthode | Route |
|---------|-------|
| GET/POST | `/devis`, `/devis/[id]` |
| POST | `/devis/[id]/accept` |
| GET/POST | `/commandes`, `/commandes/[id]` |
| GET | `/commandes/[id]/workflow` |

## Dashboard

| GET | `/dashboard/summary`, `/sales`, `/production`, `/finance`, `/stock` |

## Messagerie

| GET/POST | `/messaging/conversations`, `.../messages` |

> Liste complète : ~200 routes sous `app/api/`. Générer avec `find app/api -name route.ts`.
