# Options / Chips — Recherche et tri

## Recherche tolérante

Fichier : `lib/utils/search-normalize.ts`

- Normalisation NFD + suppression accents
- Insensible à la casse
- `includes` sur fragments internes (« chirable » → « indéchirable »)

Champs indexés articles :
- articleId, articleLabel, family, category, status, dataSource, compteurs

Champs indexés variables :
- article, bloc, fieldKey, label, source

Debounce client : 160 ms

## Tri articles

Fichier : `lib/utils/options-chips-sort.ts`

Options :
- Nom A→Z / Z→A
- Groupe / famille
- Variables ↑↓
- Actives ↓
- Anomalies ↓
- Source

Filtres liste :
- Impact prix, indicatif, anomalies, archivées, actifs, POS

## Tri variables

- Ordre POS (défaut)
- Bloc, libellé A-Z/Z-A, impact prix, source
