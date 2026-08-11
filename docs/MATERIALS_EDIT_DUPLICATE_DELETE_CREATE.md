# Matières DB — édition, duplication, archivage, création

## Actions par ligne

| Action | API | Comportement |
|---|---|---|
| Modifier | `PATCH /api/admin-backoffice/pricing/base-materials/:id` | Inline + brouillon auto |
| Dupliquer | `POST .../base-materials/:id/duplicate` | Copie en brouillon |
| Archiver | `POST .../base-materials/:id/archive` | `archived=true`, inactive POS |
| Supprimer | `DELETE .../base-materials/:id` | Si non utilisée ; sinon archive |
| Créer | `POST /api/admin-backoffice/pricing/base-materials` | Brouillon |
| Depuis stock | `POST /api/admin-backoffice/materials/from-stock` | Préremplit depuis StockItem |

## Alias routes

`/api/admin-backoffice/materials/*` → délègue vers `pricing/base-materials/*`

## UI

- `BaseMaterialsTable` — tableau principal avec filtres
- `MaterialCreateModal` — création + import stock
- `MaterialRowActions` — dupliquer, archiver, usage
- `MaterialUsageDrawer` — articles POS + stock lié

## Règle archivage

Matière utilisée dans devis/commande/formule → **archiver**, jamais supprimer physiquement.

Voir `docs/MATERIALS_SAFE_DELETE_ARCHIVE_RULES.md`
