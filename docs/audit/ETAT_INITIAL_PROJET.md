# État initial du projet — ANS ORION

| Champ | Valeur |
|-------|--------|
| Date | 2026-07-18 |
| Environnement | local (Windows) |
| Commit / branche | **non vérifiable** — dépôt **sans `.git`** |
| Périmètre | Phase 0 mega-prompt audit CRM/ERP |
| Méthode | Inspection fichiers + commandes non destructives |

## 1. Racine canonique

**Chemin vérifié :**  
`C:\Users\ans\Documents\ANS OKOK TATY AORIAN\PROJET AVANT FINAL`

| Sentinelle | Présent |
|------------|---------|
| `package.json` + `package-lock.json` | Oui |
| `app/`, `lib/`, `components/`, `prisma/` | Oui |
| `prisma/schema.prisma` | Oui |
| Dépôt Git (`.git`) | **Non** |

**Dossiers exclus / non édités :** `$ExportFolder` (supprimé précédemment), `%EXPORTFOLDER%`, `deploy/hostinger/.chrome-cdp`, archives ZIP parent (`PROJET AVANT FINAL.zip` — sans `dev.db`).

## 2. Stack détectée (vérifiée)

| Composant | Version / remarque |
|-----------|-------------------|
| Node | v24.15.0 (réel) — `engines` absent de package.json |
| npm | 11.12.1 |
| Next.js | 14.2.28 |
| React | 18.2.0 |
| TypeScript | 5.2.2 |
| Prisma | 6.19.3 |
| NextAuth | 4.24.11 |
| Tests | Vitest + Playwright |
| UI | Tailwind + Radix |

## 3. Volumes observés

| Élément | Nombre |
|---------|--------|
| Pages (`page.tsx`) | 133 |
| Routes API (`route.ts`) | 387 |
| Modèles Prisma | 155 |
| Fichiers tests | 274 |
| Scripts | 166 |

## 4. Baseline commandes (non destructives)

| Commande | Exit | Durée | Résumé |
|----------|------|-------|--------|
| `npm run typecheck` | **0** | ~21 s | Aucune erreur TS |
| `npx prisma validate` | **0** | ~few s | Schéma valide (provider sqlite actif) |
| `npm run build` | non relancé ici | — | Réussi précédemment dans la session (SWC réparé) |
| `npm run test` | non exécuté (Phase 0) | — | À lancer Lot 1 |
| `npm audit` | 0 (métadonnées vides) | — | Relancer pour détail CVSS |

Logs bruts éventuels : `docs/audit/logs/` (gitignoré).

## 5. Base de données — stratégie réelle

| Environnement | Provider | URL type | Comment |
|---------------|----------|----------|---------|
| Local (`APP_ENV=local`) | **SQLite** | `file:…/prisma/dev.db` (absolu via `lib/database-url.ts`) | `npm run dev:local` / `run-local.mjs` force sqlite |
| Docker optionnel | PostgreSQL 16 | `localhost:5433` | `docker-compose.postgres.yml` |
| Hostinger / Vercel / Neon | **PostgreSQL** | `DATABASE_URL` postgres | Patch schéma sqlite→postgresql au build (`hostinger-prisma-generate.mjs`, `vercel-build.mjs`) |

### Dérive Prisma (CRITIQUE — confirmée)

| Fichier | Provider observé |
|---------|------------------|
| `prisma/schema.prisma` | `sqlite` |
| `prisma/migrations/migration_lock.toml` | `postgresql` |
| Migrations SQL | Dialecte PostgreSQL |

**Explication vérifiée :** le schéma source de travail local est SQLite ; les builds prod **patchent temporairement** le fichier vers postgresql puis restaurent. Les migrations Prisma ciblent PostgreSQL. Risque : `migrate deploy` / `db push` sur la mauvaise base ; divergence types SQLite vs PG.

## 6. Variables d’environnement (noms seulement)

Obligatoires / importantes (exemples dans `.env*.example`) :

- `DATABASE_URL`, `DATABASE_URL_SQLITE`
- `APP_ENV`, `LOCAL_DEV`, `USE_PRODUCTION_DB`, `DEMO_MODE`
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- Hostinger / Neon : tokens et URLs postgres (non versionnés)

Présents en local : `.env.local` (créé), nombreux `.env.backup-*` (gitignore).

## 7. Anomalies P0 déjà observées (session)

1. **Pas de Git** — pas de rollback commit, pas de branche.
2. **Dérive SQLite/PostgreSQL** — voir §5.
3. **Perte temporaire données pricing locale** — base vide puis restore catalogue (`restore:local-pricing`) ; custom admin non récupérable sans backup `.db`.
4. **Chemin SQLite double** (`prisma/prisma/dev.db` vs `prisma/dev.db`) — corrigé (URL absolue).

## 8. Limites

- Pas de commit hash.
- Build / suite tests complète / E2E non rejoués dans ce fichier.
- Postgres local (5432) **non joignable** au moment du diagnostic.
- Contenu Neon/production **non inspecté** (pas de credentials dans le dépôt).

## Statut

**Phase 0 : complétée** — prêt pour rapports d’architecture / plan de rectification.
