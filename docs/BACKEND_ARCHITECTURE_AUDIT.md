# Audit architecture backend — ANS ORION

> **Date :** juin 2026  
> **Périmètre :** `app/api/*`, `lib/*`, Prisma, auth, services, audit Vercel  
> **Stack :** Next.js 14 App Router · TypeScript · Prisma · Vercel / SQLite local

---

## Synthèse exécutive

ANS ORION dispose d’un backend **fonctionnel et riche** (~217 routes API, ~81 services `lib/services/`, 99 modèles Prisma), mais la logique est **dispersée** : beaucoup de routes appellent Prisma directement, les formats JSON varient (`{ error }` vs `{ ok: false }` vs données brutes), et l’audit Vercel révèle des **404 legacy** et des **401 transitoires** sur des appels dashboard/messagerie.

| Indicateur | Valeur |
|------------|--------|
| Routes API (`app/api/**/route.ts`) | **~217** |
| Services métier (`lib/services/`) | **~81** |
| Modèles Prisma | **99** |
| Routes avec import Prisma direct | **~90+** |
| `runApiHandler` (api-guard) | Partiel (~30 % routes critiques) |
| Zod validation | Partiel (`lib/validators/*`, certaines routes RH/devis) |
| Structure `lib/server/` | **Créée** (étape 2 — migration progressive) |

---

## Étape 1 — Cartographie

### 1.1 Couches actuelles

```
app/api/*/route.ts     → HTTP (Next.js Route Handlers)
lib/auth-utils.ts      → Session + permissions
lib/api-guard.ts       → try/catch uniforme
lib/api-response.ts    → apiOk / apiError / safeErrorMessage (legacy)
lib/services/*         → Logique métier (déjà nombreux)
lib/prisma.ts          → Client Prisma singleton
prisma/schema.prisma   → Source de vérité DB (SQLite dev, Postgres Vercel)
middleware.ts          → Auth pages + headers
```

### 1.2 Points forts existants

- **Services métier** déjà présents : `commande-service`, `cart-service`, `dashboard-slices`, `late-arrival-service`, `messaging-service`, etc.
- **`requirePermission` / `requireAuth`** centralisés dans `lib/auth-utils.ts`.
- **`runApiHandler`** sur routes sensibles (clients, grand-format, etc.).
- **Zod** installé + `parseOr400`, `lib/validators/crm.ts`, etc.
- **Permissions par rôle** détaillées (`lib/auth/permissions.ts`).
- **Seeds** modulaires (`scripts/seed*.ts`).
- **Tests unitaires** : 909+ tests Vitest.
- **Audit Vercel** Playwright (`npm run audit:vercel`).

### 1.3 Problèmes par gravité

#### P0 — Critique (stabilité prod / navigation)

| Problème | Détail | Fichiers / routes |
|----------|--------|-------------------|
| Routes legacy 404 | `/cockpit`, `/crm/clients`, `/catalogue-pos`, `/panier-devis`, `/communication/ans-talk`, `/finance/paiements`, `/finance/factures`, `/logistique` | `next.config.js` redirects **ajoutés** localement — à redéployer Vercel |
| APIs 401 en audit | `/api/dashboard/*`, `/api/messaging/*`, `/api/rh/late-arrival`, `/api/nav/badges`, `/api/alerts/ticker` | Souvent **timing session** audit Playwright ; vérifier cookies `credentials: 'include'` côté client |
| Format JSON incohérent | `{ error: string }` vs `{ ok: false, error }` vs payload brut | Toutes routes — standardiser via `lib/server/http/api-response.ts` |
| Prisma direct dans routes | ~90 routes importent `@/lib/prisma` | Risque duplication, tests difficiles |

#### P1 — Important (maintenabilité)

| Problème | Détail |
|----------|--------|
| Pas de `lib/server/` structuré | **Corrigé** : modules/http/auth/validation/logger créés |
| Validation inégale | Paiements, commandes, stock : à renforcer module par module |
| Double couche validators | `lib/validators/*` + nouveau `lib/server/validation/*` — fusionner progressivement |
| Dashboard slice auth | `createDashboardSliceRoute` exige `clients:read` — OK pour admin ; documenter pour rôles restreints |
| Messagerie sans permission dédiée | `requireMessagingAuth` = `requireAuth` uniquement |

#### P2 — Amélioration

| Problème | Détail |
|----------|--------|
| Logs non structurés | `console.error` dispersé — **logger JSON** ajouté |
| Pas d’envelope `{ ok, data }` partout | Migration progressive |
| `dev-health` basique | Enrichir avec `/api/health/system` |
| Documentation sync métier | **commercial-flow.ts** documenté |

---

## Modules métier — état

| Module | Routes API | Service(s) | Repository | Validation | Notes |
|--------|------------|------------|------------|------------|-------|
| Clients | `app/api/clients/*` | `client-detail`, `client-merge` | **Pilot** `lib/server/modules/clients/` | `validators/crm` | Bon candidat vague 2 |
| POS | `app/api/pos/*` | pricing, catalogue | — | partiel | Pricing server-side OK |
| Panier | `app/api/cart/*` | `cart-service` | — | partiel | |
| Devis | `app/api/devis/*` | `devis-*` | — | partiel | |
| Commandes | `app/api/commandes/*` | `commande-service`, workflow | — | partiel | |
| Paiements | `app/api/paiements/*` | `finance.service` | — | à faire | Mobile Money ref |
| Production | `app/api/productions/*` | `production.service` | — | partiel | |
| Stock | `app/api/stock/*` | `stock-service` | — | partiel | |
| Messagerie | `app/api/messaging/*` | `messaging-service` | — | partiel | Auth session |
| RH | `app/api/rh/*` | `rh-service`, `late-arrival` | — | Zod late-arrival | |
| Admin | `app/api/admin*`, `admin-config` | multiples | — | partiel | |
| Dashboard | `app/api/dashboard/*` | `dashboard-slices` | — | — | Fallback sur erreur |

---

## APIs audit Vercel (référence)

Voir `docs/VERCEL_AUTH_AUDIT.md` :
- **9 pages 404** legacy (redirects en cours)
- **11 erreurs API** dont 401 sur widgets dashboard/messagerie pendant navigation audit
- **Erreurs React hydratation** login (P2 frontend)

---

## Ordre de correction recommandé

### Vague 1 — Stabilisation (en cours)
1. Redirects legacy `next.config.js` ✅
2. `lib/server/http/api-response.ts` standard ✅
3. `api-guard` + logger ✅
4. `/api/health/system` ✅
5. Redéploiement Vercel + re-audit

### Vague 2 — Structure
1. Migrer **clients** → repository + service
2. Migrer **commandes**, **devis**, **paiements**
3. Adopter `{ ok, data }` sur nouvelles routes

### Vague 3 — Prisma
1. `docs/DATABASE_AUDIT.md`
2. Indexes manquants
3. Harmoniser SQLite local / Postgres Vercel

### Vague 4 — Sync métier
1. `lib/server/sync/commercial-flow.ts`
2. Event log / audit trail renforcé

### Vague 5 — Qualité
1. `docs/BACKEND_TEST_PLAN.md`
2. Tests services + API handlers
3. Audit Vercel amélioré

---

## Fichiers clés

| Domaine | Chemin |
|---------|--------|
| Auth session | `lib/auth-utils.ts`, `lib/server/auth/session.ts` |
| Permissions | `lib/auth/permissions.ts`, `lib/server/auth/permissions.ts` |
| API guard | `lib/api-guard.ts` |
| Réponses standard | `lib/server/http/api-response.ts` |
| Erreurs typées | `lib/server/http/errors.ts` |
| Logger | `lib/server/logger/logger.ts` |
| Prisma | `lib/prisma.ts`, `lib/server/db/prisma.ts` |
| Sync métier | `lib/server/sync/commercial-flow.ts` |
| Module pilot | `lib/server/modules/clients/` |

---

## Critères de succès étape 1

- [x] Rapport audit complet
- [x] Priorités P0/P1/P2
- [x] Cartographie modules
- [x] Plan de correction par vagues
- [ ] Re-audit Vercel post-déploiement redirects
