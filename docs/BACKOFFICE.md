# ANS ORION — Backoffice / Administration

## Entrée unique

**URL canonique :** `/administration/:section`

Redirects legacy : `/admin/pricing?tab=*`, `/admin-control?tab=*` → `/administration/*`

## Sections (`lib/administration/routes.ts`)

| Section | Onglet | Rôle |
|---------|--------|------|
| `vue-ensemble` | Santé | Vue d'ensemble + diagnostics |
| `sante-systeme` | Santé | Santé système détaillée |
| `articles` / `catalogue` | Articles | Catalogue compact + CRUD |
| `modeles-articles` | — | Modèles d'articles (templates) |
| `variables` | Variables | Variables article |
| `options` | Chips | Options & finitions |
| `matieres` | Matières DB | Matières, grammages |
| `prix` / `formules` | PRIX 2026 | Prix, formules dynamiques |
| `regles-metier` | Anomalies | Règles métier |
| `flux-statuts` | — | Flux CRM & statuts |
| `roles-permissions` | Accès | Rôles & demandes accès |
| `synchronisation` | Santé | Centre de synchronisation |
| `import-export` | — | Import / Export CSV/JSON |
| `historique` | Versions | Versions config |
| `parametres` | Fonctions POS | Paramètres POS |
| `apercus` | Aperçus | Prévisualisation POS |

## Principes

1. **Shell léger** — `BackofficeWorkspace` charge config seulement pour onglets actifs
2. **Lazy panels** — `backoffice-tab-panels.tsx` (dynamic import)
3. **Pas de flottant** — pleine largeur, intégré sidebar
4. **Catalogue** — liste paginée API `/api/backoffice/articles`, détail à la demande
5. **CRUD articles** — POST/PATCH/DELETE + UI modal (`article-catalog-crud-modal.tsx`)

## APIs backoffice

- `GET/POST /api/backoffice/articles`
- `GET/PATCH/DELETE /api/backoffice/articles/[id]`
- `GET /api/backoffice/article-templates`
- `GET /api/backoffice/workflows`
- `GET /api/backoffice/sync-diagnostics`
- `GET /api/admin/sync-status`, `/api/admin/audit-logs`
- `GET/POST /api/admin-config/*` (import, export, publish)

## Composants clés

- `components/admin/pricing-v4/backoffice-workspace.tsx`
- `components/admin/pricing-v4/catalog/article-catalog-page.tsx`
- `components/admin/admin-control-sante-tab.tsx`

## Permissions

- Lecture : `config:view` (admin + manager)
- Écriture : rôle `admin`
