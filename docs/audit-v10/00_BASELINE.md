# ANS ORION — Baseline audit V10

Date : 2026-08-02  
Racine : `2em-export-complet-UNIQUE`  
Branche Git : `main` (aucun commit — dépôt non initialisé côté historique)  
Node : v24.15.0 · npm : 11.12.1

## Commandes reproduites

| Commande | Exit | Résumé |
|----------|------|--------|
| `npx prisma validate` | 0 | Schéma valide |
| `npx prisma generate` | 1 (EPERM DLL) | Verrou Windows si `dev:local` actif — à relancer après `npm run dev:stop` |
| `npm run lint` | NOT_RUN (Vague 1) | À compléter Vague 1 fin |
| `npm run typecheck` | NOT_RUN | À compléter |
| `npm test` | NOT_RUN | Baseline partielle ; suite complète Vague 5 |
| `npm run audit:api-auth` | NOT_RUN | À relancer après fix scanner |
| `npm audit --omit=dev` | NOT_RUN | Rapport dans `01_SECURITY_AND_SECRETS.md` |

## Constats initiaux (revalidés code)

- Fallbacks secrets littéraux : `lib/auth-secret.ts`, `scripts/provision-production.mjs`
- Auth JWT fail-open + upsert user : `lib/auth-utils.ts`, `lib/ensure-auth-user.ts`
- `isProductionDeploy()` : `NODE_ENV=production` seul ne suffit pas
- Allowlist `/api/auth` préfixe large : `middleware.ts`
- Export clean sans canaris : `scripts/export-clean.mjs`
- Setup-db HTTP gated mais toujours présent : `app/api/setup-db/route.ts`

## Cap note

Rotation externe secrets = **BLOCKED** → note max **5/10** tant que C005 non prouvé.

Anciens documents `docs/audit-10-10/` et `docs/audits/` : **historique, non vérifié** pour V10.
