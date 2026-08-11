# Options / Chips — Rapport améliorations finales

Date : 2026-07-05

## Livré

### UI/UX
- Toggles ON/OFF premium (7 colonnes booléennes)
- Recherche tolérante accents/fragments (client, debounce 160ms)
- Tri articles (8 modes) + filtres liste (7 modes)
- Tri variables (6 modes)
- Sync status visuel (overview API)
- Empty/loading states
- Panneau détail enrichi (métadonnées + toggles)
- CSS : colonnes, sticky header/action, chips filtres

### Métier (inchangé côté API)
- PATCH Prisma existant
- Exclusivité indicatif / impact prix + toasts
- Publication POS via flux backoffice existant (overview unpublishedChanges)

### Performance
- Articles : chargement unique 95 items, filtre/tri client
- Vue globale : fetch serveur + filtre recherche client
- Par article : chips chargées à la demande uniquement

## Tests

- `npx tsc --noEmit` : OK
- Script `scripts/test-chips-service.ts` : 95 articles, recherche normalize manuelle recommandée en UI

## Reste à faire

- Export CSV
- POST nouvelle variable
- Virtualisation vue globale si > 3000 lignes visibles
- Panneau diff Backoffice/POS
- Tests Playwright recherche « inde » / « chirable »
