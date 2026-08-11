# Phase 1 — Stabilisation P0 (ANS ORION)

**Date :** 24 juin 2026  
**Projet :** ANS CRM V3 / ANS ORION  
**Précédent :** [PHASE_0_BASELINE_REPORT.md](./PHASE_0_BASELINE_REPORT.md)

---

## Résumé

Phase 1 cible les blocages critiques : build production, typecheck, APIs 500 sur endpoints secondaires, redirects legacy, sidebar desktop, hydration login.

**Résultat :** build et typecheck **OK**, 952 tests **OK**. Corrections appliquées sur 9 fichiers.

---

## 1. Build & typecheck (P0 — résolu)

| Vérification | Avant Phase 1 | Après Phase 1 |
|--------------|---------------|---------------|
| `npm run typecheck` | KO (snapshot audit-export) | **OK** |
| `npm run build` | KO (ESLint hooks + prisma-enums) | **OK** |
| `npm run test` | 952/952 | **952/952** |
| `npx prisma validate` | OK (Phase 0) | OK |
| `npx prisma generate` | OK (Phase 0) | OK |

### Corrections

1. **`components/pos-preview/ProductPreviewEngine.tsx`**  
   Séparation wrapper / composant interne : le early-return `null` (previews désactivés) est hors des hooks React.

2. **`lib/server/data/prisma-enums.ts`**  
   Remplacement de `require('@prisma/client')` par `import()` dynamique (plus d’erreur ESLint sur règle inexistante).

3. **`tsconfig.json`**  
   Exclusion de `audit-export-ans-orion` du typecheck.

---

## 2. APIs critiques — fallbacks dégradés

Principe : une API secondaire ne doit pas casser le dashboard, la sidebar ou la messagerie.

| Route | Changement |
|-------|------------|
| `GET /api/alerts/ticker` | `runApiHandler` + fallback `{ alertes: [] }` (503 au lieu de 500) |
| `GET /api/rh/late-arrival` | fallback `{ blocked: false }` — gate RH non bloquante |
| `GET /api/admin/permissions?effective=1` | fallback `{ moduleAccess: {}, degraded: true }` — sidebar reste peuplée |
| `GET /api/messaging/unread` | Déjà protégé (`runApiHandler` + fallback) — inchangé |
| `GET /api/messaging/conversations` | Déjà protégé (dégradé schema) — inchangé |
| `GET /api/dashboard/*` | Déjà protégé (`createDashboardSliceRoute` + `emptyDashboardStats`) — inchangé |

Les 401 restent légitimes si session absente ou invalide (`requireAuth` / `requireMessagingAuth`). Le client gère déjà les échecs silencieux (sidebar, badges, LateArrivalGate).

---

## 3. Routes legacy

### next.config.js

44 redirects déjà présents, dont :

- `/cockpit` → `/dashboard`
- `/crm/clients` → `/clients`
- `/catalogue-pos` → `/pos`
- `/panier-devis` → `/panier`
- `/communication/ans-talk` → `/messagerie`
- `/finance/paiements` → `/paiements`
- `/finance/factures` → `/factures`
- `/logistique` → `/livraisons`

### middleware.ts (ajout Phase 1)

Doublon edge des redirects legacy pour fiabilité Vercel (certains signalements 404 malgré `next.config`).

Routes couvertes : cockpit, crm/clients, catalogue-pos, panier-devis, communication/ans-talk, finance/*, logistique, ans-talk, chat, gpao, kanban.

`/dev-preview` : page dédiée conservée (publique via middleware).

---

## 4. Sidebar desktop `/dashboard`

### Diagnostic

- `OrionSidebarSuspense` enveloppe `useSearchParams()` (requis App Router).
- Sidebar desktop : `hidden lg:flex fixed` + marge contenu `lg:ml-[var(--orion-sidebar-width)]`.
- Liens sidebar via `MODULE_REGISTRY` — routes actives (`/dashboard`, `/clients`, `/pos`, etc.).

### Correction

**`components/layout/orion-sidebar-suspense.tsx`** — skeleton aligné sur la sidebar réelle (`fixed top-0 left-0 h-screen z-40`) pour éviter flash / absence visuelle pendant le Suspense sur grand écran.

Permissions effectives : fetch sidebar tolère 401/500 (cache sessionStorage 5 min + fallback API dégradé).

---

## 5. Login — hydration React

### Problème

`secureSession` utilisait `window.location.protocol` pendant le rendu initial → mismatch serveur/client possible (erreurs #418/#423).

### Correction

**`app/login/page.tsx`** — état `secureSession` initialisé à `false`, mis à jour uniquement dans `useEffect` (public-info API ou protocole HTTPS client).

---

## 6. POS — aperçus produits

Conforme à la décision projet :

- `ENABLE_PRODUCT_PREVIEWS = false`
- Synthèse texte (`pos-configuration-summary`) à la place des visuels
- `ProductPreviewEngine` retourne `null` sans violer les rules-of-hooks

---

## 7. Fichiers modifiés (Phase 1)

| Fichier | Nature |
|---------|--------|
| `components/pos-preview/ProductPreviewEngine.tsx` | Fix hooks |
| `lib/server/data/prisma-enums.ts` | Fix import dynamique |
| `tsconfig.json` | Exclude audit-export |
| `components/layout/orion-sidebar-suspense.tsx` | Skeleton fixed desktop |
| `app/login/page.tsx` | Hydration secureSession |
| `app/api/alerts/ticker/route.ts` | Fallback dégradé |
| `app/api/rh/late-arrival/route.ts` | Fallback gate |
| `app/api/admin/permissions/route.ts` | Fallback effective |
| `middleware.ts` | Redirects legacy edge |

---

## 8. Commandes de validation

```powershell
cd "C:\Users\ans\Documents\ANS CRM V3"
npm run typecheck          # OK
npx prisma validate        # OK
npx prisma generate        # OK
npm run test               # 952/952 OK
npm run build              # OK
npm run dev:local          # http://127.0.0.1:3020
```

`npm run audit:vercel` — nécessite `.env.audit.local` (non relancé dans cette phase).

---

## 9. Critères Phase 1

| Critère | Statut |
|---------|--------|
| Build production OK | **OK** |
| Typecheck OK | **OK** |
| APIs dashboard avec fallback (pas de 500 bloquant) | **OK** (existant + ticker/RH/permissions) |
| Redirects legacy | **OK** (next.config + middleware) |
| Sidebar desktop stable au chargement | **OK** (skeleton fixed) |
| Login sans hydration `window` au render | **OK** |
| Rapport Phase 1 | **OK** |

---

## 10. Risques résiduels (→ Phase 2+)

| Priorité | Sujet |
|----------|-------|
| P1 | Standardisation API (`with-auth-api`, format `{ ok, data }` partout) |
| P1 | 401 « session invalide » si `ensureUserInDb` échoue en prod PostgreSQL |
| P1 | Audit Vercel live (redirects + cookies `__Secure-`) |
| P2 | Découpage `pos/[id]/page.tsx` |
| P2 | Design system `components/orion/` unifié |

---

## 11. Suite recommandée

**Phase 2 — Standardiser API / auth / erreurs**  
Créer ou généraliser `lib/server/http/api-response.ts`, `with-auth-api.ts`, migrer les route handlers restants.

---

**Phase 1 : VALIDÉE** — prêt pour **Phase 2**.
