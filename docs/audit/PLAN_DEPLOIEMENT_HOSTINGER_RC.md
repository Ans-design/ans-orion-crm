# Plan déploiement Hostinger — Release Candidate (Vague 2)

| Date | 2026-07-19 (maj VF) |
|------|---------------------|
| Verdict actuel | **NO-GO PRODUCTION** — backup métier MANQUANT |
| Cible | Node.js Web App Hostinger · PostgreSQL (Neon ou Postgres Hostinger) |
| VF-P0A | `ALLOW_VERCEL_DB_PUSH_DATA_LOSS` / `ALLOW_PROD_DB_SETUP` / `ALLOW_NEON_DB_PUSH` **absents** en prod |

## 1. Prérequis obligatoires

| # | Prérequis | Statut |
|---|-----------|--------|
| 1 | Backup PostgreSQL restaurable testé | **MANQUANT** |
| 2 | `DATABASE_URL` postgres en hPanel (pas `file:`) | À vérifier côté hPanel |
| 3 | `NEXTAUTH_SECRET` ≥ 32 car. | Obligatoire |
| 4 | `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` = URL prod | Obligatoire |
| 5 | `SETUP_SECRET` fort ; `ALLOW_SETUP_DB` **absent** en prod | Correctif V2 appliqué |
| 6 | Node 20.x | Documenté |
| 7 | Pas de double écriture Vercel prod + Hostinger même DB | Décision D-005 |

## 2. Commandes hPanel

| Étape | Commande |
|-------|----------|
| Install | `npm ci` |
| Build | `npm run build:hostinger` (= generate Prisma PG + `next build`) |
| Start | `npm run start:hostinger` ou `npm run start -- -H 0.0.0.0 -p $PORT` |

**Interdit au build :** `prisma db push --accept-data-loss`, `migrate reset`, seed automatique.

Schéma DB : appliquer **hors build**, après backup, avec procédure validée (`db:migrate:deploy` ou équivalent) — **pas encore autorisé** sans backup.

## 3. Variables (noms uniquement)

`DATABASE_URL`, `DIRECT_URL` (si pooler), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `HOSTINGER=true`, `USE_PRODUCTION_DB=true`, `AUTH_TRUST_HOST=true`, `SETUP_SECRET`, `CRON_SECRET`, `DEMO_MODE=false`, `ALLOW_DEMO_LOGIN` (off), `ALLOW_SETUP_DB` (off), `ALLOW_HOSTINGER_DEPLOY` (local only).

## 4. Correctifs Vague 2 (Hostinger)

| Fichier | Changement |
|---------|------------|
| `scripts/hostinger-build.mjs` | Imports dupliqués corrigés ; **suppression** `db push --accept-data-loss` |
| `scripts/prestart-hostinger.mjs` | Exit 1 si prod sans Postgres |
| `app/api/setup-db/route.ts` | Désactivé en prod sauf `ALLOW_SETUP_DB=true` ; plus de `--accept-data-loss` |
| `.gitignore` + `deploy/hostinger/.gitignore` | `*.env` / secrets Hostinger ignorés |
| Auth imports/repair | Write perms only (voir CHANGELOG) |

## 5. Checklist pré-déploiement

- [ ] Backup DB restauré sur instance jetable
- [ ] `npm run typecheck` exit 0
- [ ] `npm run test` ciblé Lot2–4 + V2 guards exit 0
- [ ] `npm run build:hostinger` sur machine CI/staging avec URL postgres
- [ ] Health : `/api/health`, `/api/health/db`
- [ ] Login admin réel (pas démo)
- [ ] Une vente/devis smoke sans double stock
- [ ] Cron secrets rotés

## 6. Rollback

### Code

1. Redéployer le build précédent (artefact Hostinger / commit stable quand Git dispo).
2. `npm run hostinger:healthcheck`.

### Données

1. Restaurer le dump PostgreSQL pré-déploiement (**obligatoire avant toute migrate**).
2. Vérifier compteurs clients / commandes / formules.
3. **Sans backup : ne pas migrer.**

## 7. Scripts locaux (garde)

Les scripts `npm run hostinger:*` sont **bloqués en mode local** (`APP_ENV=local`) via `guard-hostinger-deploy.mjs`.  
Release : `ALLOW_HOSTINGER_DEPLOY=true` uniquement après validation propriétaire.

## 8. Verdict

| Niveau | Autorisé ? |
|--------|------------|
| Développement local | Oui |
| Staging (DB séparée) | Oui après build + tests |
| Production Hostinger | **NON** jusqu’à backup + validation propriétaire |
