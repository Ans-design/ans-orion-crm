# Rapport final — Options / Chips par article

## Résumé

L'onglet Options / Chips affichait une liste vide car il ne lisait que `ArticlePricingProfile` (souvent vide) au lieu du **catalogue POS complet** (95 articles) et des **variables config-types**.

## Corrections

### Backend

- `admin-backoffice-chips.catalogue.ts` — fallback config-types
- `admin-backoffice-chips.service.ts` — fusion catalogue + DB
- APIs :
  - `GET /api/admin-backoffice/options/articles`
  - `GET /api/admin-backoffice/options/articles/:articleId/chips`
  - `GET /api/admin-backoffice/options/chips`
  - `PATCH /api/admin-backoffice/options/chips/:chipId`

### Frontend

- `OptionsChipsWorkspace` — nouvelles APIs, stats header, diagnostics
- `OptionsArticlesList` — chips actifs, badge POS, états erreur

## Résultats tests script

```
POS_CATALOGUE 95
articles returned 95
pkg-hangtag chips: 37 total, 37 actives
global sample: 4665 variables totales
```

## Comportement

| Mode | Comportement |
|------|--------------|
| Par article | Liste 95 articles → variables groupées par bloc |
| Vue globale | Tableau toutes variables, filtres, limite 2000 |
| Édition | PATCH matérialise seed → DB si nécessaire |

## Bugs restants

- Export CSV — stub
- POST nouvelle variable — stub
- Pagination vue globale si > 2000 lignes filtrées

## Build

`npx tsc --noEmit` — OK
