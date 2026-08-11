# Architecture actuelle détaillée — ANS ORION

| Champ | Valeur |
|-------|--------|
| Date | 2026-07-18 |
| Source | Code ouvert + `docs/ARCHITECTURE.md` / `docs/MODULES_MAP.md` (à croiser) |
| Statut | Confirmé partiellement contre le code |

## Stack

Next.js 14 App Router (`app/`), API Routes (`app/api/`), Prisma 6, NextAuth 4, React 18, Tailwind/Radix, Vitest, Playwright.

## Frontières

| Couche | Emplacement | Rôle |
|--------|-------------|------|
| UI pages | `app/(app)/**/page.tsx` | Écrans métier |
| API | `app/api/**/route.ts` | REST + auth |
| Services | `lib/services/`, `lib/server/modules/` | Règles métier |
| Données | Prisma client `lib/prisma.ts` | Accès DB |
| Auth | `lib/auth.ts`, `middleware.ts`, `lib/auth/permissions.ts` | Session + RBAC |
| Navigation | `lib/modules/module-registry.ts`, `role-registry.ts` | Menus par rôle |
| Pricing | `lib/pricing/*`, admin-backoffice | Source prix publiée |

## Pages / API / modèles (vérifiés)

- **133** pages, **387** API, **155** modèles Prisma.

## Middleware

`middleware.ts` — protection routes, session NextAuth.

## Auth & rôles

NextAuth credentials / comptes locaux ; permissions via `requirePermission` / registries. Matrice rôle×module : à approfondir (Lot 2).

## Déploiement

- Local : SQLite + `npm run dev:local`
- Hostinger Node : patch Prisma → PostgreSQL
- Vercel / Neon : idem patch
- Docker Postgres optionnel port **5433**

## Documents existants (ne pas dupliquer)

| Doc historique | Statut vs code |
|----------------|----------------|
| `docs/ARCHITECTURE.md` | À revalider |
| `docs/MODULES_MAP.md` | Utile |
| `docs/SYNC_MATRIX.md` | Confirmé existant — base pour sync |
| `docs/FLOW_GLOBAL.md` | Hub commande `/commandes/[id]` |
| `docs/audit-10-10/*` | Juillet 2026 — partiellement obsolète sur DB locale |

## Risques architecture

1. Double couche `lib/services` + `lib/server/modules` (drift logique).
2. Namespaces API redondants (`admin`, `admin-backoffice`, `admin-config`).
3. Patch schéma Prisma au build (fragile si crash mid-build).
4. Absence de dépôt Git sur la copie de travail actuelle.

## Suite

Inventaire modules détaillé → `INVENTAIRE_MODULES_CRM_ERP.md`.
