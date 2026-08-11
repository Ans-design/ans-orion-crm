# Administration Backoffice — Rapport remplacement total (vague 1)

## Résumé

L’ancien Backoffice dispersé (12+ onglets topbar + 25 sections URL) est **remplacé** par **`/administration/backoffice`** — shell v2 sombre premium avec **11 onglets** et **tableau prix global éditable**.

## Livré

### UI (`components/backoffice-v2/`)
- `AdminBackofficeShell` — orchestrateur
- `AdminBackofficeHeader`, `AdminBackofficeTabs`, `AdminBackofficeStats`
- `articles/BackofficeArticlePriceTable` — édition inline prix base, qté min
- `articles/BackofficeArticlePriceFilters`
- `audit/BackofficeAuditLogPanel`

### Server (`lib/server/modules/backoffice-v2/`)
- `admin-backoffice.service.ts` — overview + price table
- `admin-backoffice.mapper.ts`, `admin-backoffice.validation.ts`, `admin-backoffice.types.ts`

### APIs `/api/admin-backoffice/`
- `overview`, `articles-price-table`, `articles-price-table/[id]` PATCH
- `anomalies`, `audit-log`, `publish`, `sync-pos`, `pricing/simulate`

### Redirections
- Toutes sections `/administration/:section` legacy → backoffice v2 (`lib/administration/backoffice-redirects.ts`)
- `/backoffice` → `/administration/backoffice`

### Documentation
- `BACKOFFICE_LEGACY_REMOVAL_AUDIT.md`
- Docs vague 1 précédente conservées

## Tests

- `npx tsc --noEmit` : OK
- Manuel : ouvrir `/administration/backoffice`, onglets, tableau prix, sauvegarde ligne

## Prochaines étapes (ultraprompt phases 4–7)

1. Actions en lot tableau prix
2. `BackofficeChipsTable`, `BackofficeMaterialsTable` dédiés v2
3. Simulateur panel commun
4. Matrice accès interactive
5. Archiver `pricing-admin-shell` derrière feature flag
6. Tests Playwright 37 scénarios
7. `npm run build` sans lock Prisma

## Critères validation

| Critère | Statut |
|---------|--------|
| Ancien UI plus entrée principale | ✅ Redirections |
| Navigation 11 onglets | ✅ |
| Tableau prix opérationnel | ✅ Inline partiel |
| Données DB réelles | ✅ |
| POS / devis / commandes intact | ✅ |
| Build | ⏳ |
