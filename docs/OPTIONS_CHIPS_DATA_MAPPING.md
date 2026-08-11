# Mapping données Options / Chips

## Article POS → DTO

| Source | Champ DTO | Notes |
|--------|-----------|-------|
| `catalogue.id` | `articleId` | ex. `pkg-hangtag` |
| `catalogue.name` ou `profile.articleLabel` | `articleLabel` | |
| `CAT_LABELS[category]` ou `profile.family` | `family` | |
| `catalogue.category` | `category` | |
| `profile.status` ou `'catalogue'` | `status` | |
| `profile.active` ou `true` | `active` | |
| groupes DB ou config | `variableCount` | |
| — | `dataSource` | `database` \| `catalogue` \| `hybrid` |

## Variable / Chip → ChipTableRow

| Prisma / Config | ChipTableRow |
|-----------------|--------------|
| `ProductOptionGroup.id` | `groupId` |
| `ProductOptionValue.id` ou synthétique | `id` |
| `sectionTitle` | `blockLabel` → `blockKey` via `resolveBlockKey()` |
| `fieldKey` | `fieldKey` |
| `label` (groupe ou valeur) | `label` |
| `impactsPrice && !isInformational` | `impactsPrice` |
| `isInformational` | `isInformational` |
| `!active` | `archived` |
| `source` ou `'catalogue'` | `source` |

## Blocs normalisés

Dimensions, Matière / Support, Couleur, Impression, Finition, Orientation, Particularités, Livraison, Notes, Reliure, Face, Autre.

## Règles impact

- `isInformational = true` → `impactsPrice = false`
- `impactsPrice = true` → `isInformational = false`
- Appliqué dans `patchChipGroup()` et UI détail

## IDs seed (catalogue non synchronisé)

Format : `seed::{articleId}::{fieldKey}`

Au PATCH → `ensureDbGroupFromSeed()` → ID Prisma réel.
