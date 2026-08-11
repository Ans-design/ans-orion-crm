# Plan refactor Options / Chips par article

## Objectif

Centre de gestion des variables POS organisé par article, avec vue globale d'audit.

## Architecture

```
OptionsChipsWorkspace
├── Mode Par article
│   ├── OptionsArticlesList     ← GET /options/articles
│   ├── OptionsArticleHeader    ← GET /options/articles/:id/chips
│   ├── OptionsBlockAccordion
│   │   └── ChipsDataTable
│   └── OptionsVariableDetailPanel ← PATCH /options/chips/:id
└── Mode Vue globale
    └── ChipsDataTable          ← GET /options/chips
```

## Service unifié

`admin-backoffice-chips.service.ts` + `admin-backoffice-chips.catalogue.ts`

1. **listChipArticles** — POS_CATALOGUE ∪ DB profiles
2. **getArticleChips** — DB groups ∪ config-types seeds
3. **getGlobalChips** — toutes variables tous articles
4. **patchChipGroup** — DB + ensure seed

## Phases livrées

- [x] P1 — Audit cause liste vide
- [x] P2 — Mapper catalogue + config-types
- [x] P3 — APIs `/options/*`
- [x] P4 — UI master-detail + vue globale
- [x] P5 — Empty states + diagnostics
- [ ] P6 — POST création variable
- [ ] P7 — Export CSV
- [ ] P8 — Tests Playwright

## Non-régression

- Pricing engine : `ProductOptionGroup` inchangé
- POS : `catalogue-service` inchangé
- Publication : `publish-dynamic-pricing` inchangé
