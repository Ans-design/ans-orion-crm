# Matrice de traçabilité — correction ANS ORION (Phase A→…)

Date : 2026-07-30 · Workspace sans dépôt `.git` (baseline Git N/A).

| ID | Constat audit | Fichiers réels | Occ. | Risque | Correction retenue | Tests | Statut |
|----|---------------|----------------|------|--------|-------------------|-------|--------|
| C1 | Secrets .env sur disque | `.env.local`, backups | 10+ fichiers | Critique | `.gitignore` renforcé ; doc rotation ; pas d’affichage valeurs | — | FAIT (local) |
| C2 | MDP littéraux code | `dev-accounts`, `local-auth`, `orion-v29-accounts` | 20+ | Critique | Env-only ; fail-closed | lot2 + prompt-p0 | FAIT |
| C3 | setup-db public | `middleware`, `api/setup-db` | 1 | Critique | 404 prod ; hors PUBLIC_API_EXACT ; rate limit | audit-security + p0 | FAIT |
| M6 | catch vides | paiements, production, TarifsLegacyGrid | 4 | Majeur | toast + ErrorState + retry | manuel + typecheck | FAIT |
| M3 | page-access RH | `page-access.ts` | — | Majeur | RH/stock/caisse/messagerie/historique | à étendre | FAIT partiel |
| M1 | Prix TS runtime | `pos-catalog-entry-price`, `catalogue-pos-builder` | — | Majeur | Plus de fallback `prixDepart` catalogue.ts au POS | pos-catalog-entry + catalogue-pos-builder | FAIT (POS) |
| M2 | APIs sans requirePermission | `app/api/**/route.ts` | 0 requireAdmin restant | Majeur | Toutes routes API sans requireAdmin(OrManager) | prompt-lot4-api-permissions | FAIT |
| M4 | Triple pile Admin | components/admin* | 3 piles | Majeur | Carte doc + Aperçus menu | docs/ADMIN_UI_PILES_MAP | FAIT doc + menu |
| M7 | any finance/POS | material-context, pricing-resolver, excel-import, paiements | — | Majeur | Lot 6 ciblé | typecheck | FAIT partiel |
| M8 | deps mortes | package.json | ~18 candidats | Mineur | Inventaire sans purge | DEAD_DEPS_CANDIDATES | FAIT inventaire |
| M9 | radius 8–12px | material-modal, ans-articles-table | 9 | Mineur | → 7px | — | FAIT partiel |
| AP | Aperçu local | apercus + dev-preview | — | — | Menu + hub 3020 | administration-apercus-local | FAIT |
| UX2 | catch vides pages | `app/(app)/**/page.tsx` | 0 | Majeur | console.warn + test scan | prompt-empty-catch-pages | FAIT |
| B1 | build prod | `.next-build` | — | Majeur | `NEXT_DIST_DIR=.next-build npm run build` OK | build log | FAIT |

Node : v24.15.0 · npm 11.12.1 · `npm run typecheck` : OK (baseline).
