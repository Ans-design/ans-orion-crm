# Options / Chips — Améliorations UI/UX

## Changements visuels

- Toggles ON/OFF (`OptionsToggleCell`) remplacent les checkboxes dans tableau et panneau détail
- Couleurs par type : actif (vert), POS/prix (bleu), stock (vert), prod (cyan), indicatif (violet), archivé (orange)
- Tableau : colonnes dimensionnées, header sticky, ligne sélectionnée, alternance légère, action sticky droite
- Liste articles : cartes compactes, badges POS/Catalogue/Publié, compteurs chips/actifs
- Compteurs article sous forme de mini-badges
- Filtres locaux en chips compactes
- Barre sync : « Synchronisé » / « X modification(s) non publiée(s) »
- États vides premium avec icône (`OptionsEmptyState`)
- Skeleton loading (`OptionsLoadingState`)

## Composants ajoutés

- `OptionsToggleCell.tsx`
- `OptionsSourceBadge.tsx`
- `OptionsEmptyState.tsx`
- `OptionsLoadingState.tsx`
- `OptionsSyncStatus.tsx`

## Utils

- `lib/utils/search-normalize.ts`
- `lib/utils/options-chips-sort.ts`
