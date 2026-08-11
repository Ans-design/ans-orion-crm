# ANS ORION — Matrice de remédiation V2

Date : 2026-07-30 (maj intégration complète)  
Baseline mesurée : Node v24.15.0 · npm 11.12.1 · **pas de `.git`** · pages **136** · API **394** · modèles Prisma **155** · `prixDepart` catalogue **99** · `requireAdmin` API **0** · fichiers test **313** · POS `[id]` ~**2609** lignes.

États : À CONFIRMER | CONFIRMÉ | EN COURS | CORRIGÉ | TESTÉ | BLOQUÉ | NON APPLICABLE

| ID | Constat audit | Fichiers réels | Occ. | Risque | Correction | Tests | Statut |
|----|---------------|----------------|------|--------|------------|-------|--------|
| A1 | Secrets .env disque | `.env.local`, backups | 10+ | Critique | `.gitignore` + rotation doc ; non versionnés (pas de git) | — | CORRIGÉ (local) |
| A2 | MDP littéraux runtime | `dev-accounts`, `local-auth`, v29 | 0 littéral | Critique | Env-only fail-closed | prompt-p0-security | TESTÉ |
| A3 | setup-db public | `api/setup-db`, middleware | 1 | Critique | 404 prod | audit + p0 | TESTÉ |
| C1 | Catch vides UX | paiements, production, tarifs + pages app | 0 vide pages | Majeur | toast/warn + retry | empty-catch-pages | TESTÉ |
| D1 | API requireAdmin | `app/api/**/route.ts` | 0 | Majeur | requirePermission | lot4-api-permissions | TESTÉ |
| D2 | page-access RH/stock | `page-access.ts` | — | Majeur | élargi | — | CORRIGÉ |
| E1 | prixDepart runtime POS | catalogue.ts + builder | 99 seed | Majeur | POS sans fallback TS | pos-catalog-entry + builder | TESTÉ |
| F1 | any pricing/sync | material-context, event-pricing, paiements | ↓ | Majeur | types Prisma/DTO | typecheck | CORRIGÉ partiel |
| G1 | Variables hors menu | `admin-macro-modules`, nav JSON | 1 page | Majeur | entrée Organisation | nav-discoverability | CORRIGÉ |
| G2 | Sync hors menu | idem | 1 page | Majeur | entrée Production | nav-discoverability | CORRIGÉ |
| G3 | Triple pile Admin | admin / administration / backoffice-v2 | 3 | Majeur | carte piles, pas big-bang | ADMIN_UI_PILES_MAP | CORRIGÉ doc |
| G4 | next-action commande | `next-action.ts` | — | Majeur | délègue hub | — | CORRIGÉ |
| H1 | deps mortes | package.json | ~18 | Mineur | npm uninstall (purge) | DEAD_DEPS | TESTÉ (install) |
| I1 | radius 8–12px | CSS admin | ↓ | Mineur | 7px échantillon | — | CORRIGÉ partiel |
| K1 | En attente stock injustifié | `devis-accept-service` + rule | — | Majeur | seulement stock insuffisant | stock-attente-mapping | TESTÉ |
| B1 | Build prod | `.next-build` | — | — | OK 2026-07-30 | build log | TESTÉ |
| J1 | Docs audits | `docs/audits/` | — | — | matrice + maps | — | CORRIGÉ |
| L10 | E2E smoke | e2e/ + DB path abs | 16 | Majeur | e2e.db canonique + markers sidebar | test:e2e:smoke | **TESTÉ 16/16** |
| L11 | Git status | — | — | — | pas de dépôt git | — | NON APPLICABLE |
| L12 | SQLite E2E double fichier | `prisma/e2e.db` vs `prisma/prisma/e2e.db` | 1 | Critique E2E | URL absolue + canon `database-url` | database-url + smoke | TESTÉ |

## Checkpoint intégration (fin session)

**Intégré** : P0 sécu, Lot4 API, prix POS, catch UX, nav Variables/Sync, deps mortes, stock attente, radius partiel, **E2E smoke vert**.

**Restant (hors 10/10 métier)** : monolithes POS/Formules/CPS ; `any` restants page POS ; E2E chaîne métier + deny rôles ; rotation secrets humaine.

**Action humaine** : rotation secrets externes ; `.env.local` local only.
