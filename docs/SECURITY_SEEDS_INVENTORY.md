# Inventaire seeds / bootstrap — SEC-01

**Règle production :** aucun mot de passe connu, aucun compte démo, aucun quick-login, aucun signup public, aucun secret dans les logs.

| Script / chemin | Environnement | Crée users ? | Notes |
|-----------------|---------------|--------------|-------|
| `scripts/seed.ts` | **local** uniquement (`NODE_ENV≠production`, pas HOSTINGER / USE_PRODUCTION_DB) | Oui (admin + démo) | MDP via `SEED_*` / `ORION_SEED_BOOTSTRAP_SECRET` ≥12 — jamais loggés |
| `scripts/seed-demo.ts` | **local** (`APP_ENV=local`) | Oui (rôle demo) | `SEED_DEMO_EMAIL` + `SEED_DEMO_PASSWORD` — fail-closed hors local |
| `scripts/seed-production.ts` | **production / staging Neon** | Via sous-scripts | Exige `ORION_SEED_BOOTSTRAP_SECRET` ≥32 ; ne génère plus de secret dans les logs |
| `scripts/create-admin.ts` | local / ops | Oui (admin) | `ADMIN_EMAIL` + `ADMIN_PASSWORD` ; prod → `mustChangePassword=true` |
| `scripts/reset-admin-password.ts` | ops | Upsert admin | Force `mustChangePassword` sauf local `RESET_SKIP_MUST_CHANGE` |
| `scripts/ready-check-local.mjs` | **local** | Répare comptes test | Comptes uniquement via env READY_* / SEED_* / DEMO_* |
| `scripts/setup-production-db.mjs` | staging/prod setup | Via seeds | Ne log plus de couples email/MDP |
| `scripts/seed-v29*.ts` / `ensure:v29` | **local / démo** | Employés + users | Mots de passe via `ORION_V29_PASSWORDS_JSON` |
| Fixtures / e2e | **test automatisé** | Selon env E2E_* | Pas de fallback MDP faible |
| Migrations Prisma | schéma | Non (sauf seed SQL absent) | Champ `User.mustChangePassword` |

## Première connexion

Après bootstrap / reset admin en production : `mustChangePassword=true` → redirection `/change-password` + API `/api/auth/change-password` → déconnexion → nouveau login.

## Démonstration

Comptes démo **uniquement** si `APP_ENV=local` + flags `ALLOW_DEMO_*` / `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS`. Interdits au boot production (`assert-production-boot.ts`).
