# Options / Chips — Comportement toggles

## Composant

`OptionsToggleCell` — role="switch", aria-label, focus ring, loading state.

## Colonnes tableau

| Colonne | Champ API | Règle |
|---------|-----------|-------|
| Actif | `active` | — |
| POS | `visiblePos` | — |
| € Prix | `impactsPrice` | Désactive indicatif si ON |
| Stock | `impactsStock` | — |
| Prod | `impactsProduction` | — |
| Indicatif | `isInformational` | Désactive impact prix si ON |
| Archivé | `active=false` | Inverse de archivé |

## Persistance

`PATCH /api/admin-backoffice/options/chips/:chipId`

- État loading par cellule (`togglingKey`)
- Toast succès / info (exclusivité indicatif-prix)
- Rechargement article ou vue globale après succès
- Compteur « modifié non publié » incrémenté côté UI

## Backend

Règle existante dans `patchChipGroup` : indicatif ↔ impact prix exclusifs.
