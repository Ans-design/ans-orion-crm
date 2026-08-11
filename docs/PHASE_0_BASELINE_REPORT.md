# Phase 0 — Rapport baseline ANS ORION

> Généré le **24/06/2026** — lecture seule, aucune correction métier appliquée.
> Référence plan : `PROMPTS_CURSOR_ANS_ORION_10_PHASES_COMPLET.txt`

## Résumé général

| Indicateur | État |
|------------|------|
| Projet | ANS ORION / ANS CRM V3 — Next.js 14.2.28 |
| Modèles Prisma | 99 — schema **valide** |
| Tests Vitest | **952/952 OK** (163 fichiers) |
| Typecheck (`tsc`) | **KO** (5 erreurs — voir §1) |
| Build production | **KO** (ESLint errors — voir §2) |
| Prisma generate | **OK** |
| Dev local | Serveur actif `http://127.0.0.1:3020` |
| Audit Vercel (01/07/2026) | 24/33 pages OK, 9 échecs, 11 erreurs API |
| Bundle audit ChatGPT | `ANS_ORION_FULL_AUDIT_BUNDLE.zip` (~190 Ko) |

**Conclusion baseline :** le cœur métier compile et les tests passent, mais **le build CI/production échoue** sur ESLint (hooks React + règle ESLint manquante). Typecheck échoue à cause du dossier `audit-export-ans-orion/` inclus par `tsconfig.json`. Des problèmes P0 Vercel (redirects legacy 404, APIs dashboard/messaging) restent ouverts — **Phase 1 prioritaire**.

---

## 1. État TypeScript (`npm run typecheck`)

**Résultat : ÉCHEC** (exit 2)

| Fichier | Erreur |
|---------|--------|
| `audit-export-ans-orion/source-snapshot/lib/modules/*.ts` | Cannot find module `./types` |
| `audit-export-ans-orion/source-snapshot/lib/navigation/sidebar-universes.ts` | Cannot find module `./nav-badges-shared` |
| `audit-export-ans-orion/source-snapshot/playwright.config.ts` | Cannot find module `./e2e/helpers/env` |

**Cause :** le dossier `audit-export-ans-orion/` (bundle d'audit généré) est inclus via `"**/*.ts"` dans `tsconfig.json` mais ne contient qu'un snapshot partiel.

**Action Phase 1 (infra, non métier) :** ajouter `"audit-export-ans-orion"` à `tsconfig.json` → `exclude`.

**Hors snapshot :** pas d'erreur TypeScript détectée sur le code applicatif principal lors de cette passe (build compile Next.js avant lint).

---

## 2. État build (`npm run build`)

**Résultat : ÉCHEC** — compilation Next.js OK, échec **Linting and checking validity of types**

### Erreurs bloquantes (ESLint)

| Fichier | Règle | Détail |
|---------|-------|--------|
| `components/pos-preview/ProductPreviewEngine.tsx:54,57,69` | `react-hooks/rules-of-hooks` | `useState` / `useMemo` **après** `return null` si `!ENABLE_PRODUCT_PREVIEWS` |
| `lib/server/data/prisma-enums.ts:35` | `@typescript-eslint/no-require-imports` | Règle ESLint **non définie** dans la config |

### Avertissements (non bloquants seuls, mais Next build les traite en erreur si configuré strict)

- `react-hooks/exhaustive-deps` : `clients/page.tsx`, `dashboard/page.tsx`, `pos/[id]/page.tsx`, etc.
- `@next/next/no-img-element` : `livreur-delivery-view.tsx`

**Impact :** déploiement Vercel / `npm run build` **bloqué** tant que les 2 erreurs ci-dessus ne sont pas corrigées.

---

## 3. État Prisma

| Commande | Résultat |
|----------|----------|
| `npx prisma validate` | OK — schema valide |
| `npx prisma generate` | OK — Client v6.19.3 |

### Points d'attention

- **Dual-env :** `schema.prisma` provider = `sqlite` ; migrations lock = `postgresql`
- **99 modèles**, 6 enums Prisma
- **Panier :** pas de modèle DB (localStorage + `UserPreference`)
- **Enums runtime :** bridge `lib/server/data/prisma-statut-bridge.ts` créé pour éviter imports circulaires Next (fix dashboard partiel)
- **Seeds :** 28+ scripts sous `scripts/`, entrée `safe-seed.ts`

---

## 4. État routes

### Canoniques (OK audit Vercel)

`/dashboard`, `/clients`, `/pos`, `/panier`, `/devis`, `/commandes`, `/messagerie`, `/factures`, `/paiements`, `/livraisons`, `/production`, `/stock`, `/administration/vue-ensemble`, `/rh/paie`, `/rh/equipements`

### Redirects configurés (`next.config.js` — 44 règles)

| Legacy | Destination |
|--------|-------------|
| `/cockpit` | `/dashboard` |
| `/crm/clients` | `/clients` |
| `/catalogue-pos` | `/pos` |
| `/panier-devis` | `/panier` |
| `/communication/ans-talk`, `/ans-talk` | `/messagerie` |
| `/finance/paiements` | `/paiements` |
| `/finance/factures` | `/factures` |
| `/logistique` | `/livraisons` |

### Problème P0 — redirects 404 en prod Vercel

L'audit Vercel (01/07/2026) signale **HTTP 404** sur les URLs legacy alors que `next.config.js` définit les redirects. Hypothèses :

1. Redirects non déployés / build échoué en prod
2. Audit HTTP sans follow redirects
3. Middleware intercepte avant redirect

**~94 pages** App Router · **~220 routes API**

---

## 5. État APIs (prioritaires Phase 1)

APIs à stabiliser (plan 10 phases) :

| API | Risque connu |
|-----|--------------|
| `/api/dashboard/summary` | 500 enums Prisma (fix partiel) |
| `/api/dashboard/production`, `/finance`, `/sales`, `/stock` | Agrégations, dépendances enums |
| `/api/messaging/unread`, `/conversations`, `/users` | 401 polling session expirée |
| `/api/cart` | Validation config JSON |
| `/api/alerts/ticker` | Polling fréquent |
| `/api/admin/permissions?effective=1` | Permissions matrix |
| `/api/rh/late-arrival` | RH permissions |

**Pattern actuel :** auth dans handlers (`requireAuth`), pas au middleware edge pour la plupart des API.

**Audit Vercel :** 11 erreurs API, 118 erreurs réseau 4xx/5xx sur session de test.

---

## 6. État auth / session

- **NextAuth 4.24** + Prisma adapter
- Middleware : pages protégées → `/login?reason=session_expired`
- Rôles : `lib/page-access.ts`, `lib/modules/permission-matrix.ts`
- **Problèmes signalés Phase 1 :** 401 incohérents en session active, hydration login React #418/#423, RSC payload failed

---

## 7. État POS

| Élément | État |
|---------|------|
| Catalogue | 95 articles (`POS_CATALOGUE`) |
| Aperçus produit | **Désactivés** — `ENABLE_PRODUCT_PREVIEWS = false` |
| Synthèse | `PosConfigurationSummary` + `PosMissingFieldsBanner` |
| Panier | Texte only (preview retiré) |
| Configurateur | `pos/[id]/page.tsx` — **monolithique (~2000 lignes)** |
| Validation preview | `npm run validate:pos-previews` — PASS |
| Build | **Bloqué** par hooks `ProductPreviewEngine` |

**Flux métier :** CRM → POS → Panier → Devis → Commande — **non modifié**, à tester manuellement post-build.

---

## 8. État UX/UI

- Design system partiel : `orion-surface-*`, shadcn/ui, variables CSS
- Pas encore de dossier `components/orion/` unifié (Phase 5)
- Sidebar 11 univers — fonctionnelle en local
- **Signalé Phase 1 :** sidebar desktop parfois absente sur `/dashboard`
- Mode clair/sombre via variables CSS
- POS : plus d'aperçu visuel trompeur (décision validée)

Docs existants : `DESIGN_SYSTEM_UX.md`, `UI_AUDIT.md`, `UX_AUDIT_GLOBAL.md`

---

## 9. État tests

```
Test Files  163 passed (163)
Tests       952 passed (952)
Durée       ~10.5s
```

Playwright e2e : présent (`e2e/`, 21 fichiers) — non exécuté dans cette baseline.

---

## 10. Travail déjà réalisé (hors phases)

| Item | Statut |
|------|--------|
| Suppression aperçus POS UI | Fait |
| Registre preview 95 produits | Fait (désactivé UI) |
| Bridge enums Prisma dashboard | Partiel |
| Bundle audit ChatGPT | Fait |
| Fix enums `Cannot read properties of undefined (reading 'Livre')` | Partiel |

---

## Risques priorisés

### P0 — Critique (Phase 1)

1. **Build production KO** — hooks `ProductPreviewEngine`, ESLint `prisma-enums.ts`
2. **Redirects legacy 404 Vercel**
3. **API 500 dashboard / messagerie**
4. **401 polling** messagerie / nav badges
5. **Sidebar / hydration login**

### P1 — Important (Phases 2–4)

6. Standardisation API (`with-auth-api`, `api-response`)
7. Repository Prisma centralisé
8. Découpage `pos/[id]/page.tsx`
9. Sync prix Backoffice ↔ POS
10. Exclure `audit-export-ans-orion` du typecheck

### P2 — Amélioration (Phases 5–7)

11. Design system `components/orion/`
12. TanStack Table standard
13. Data quality / administration

### P3 — Futur (Phases 8–10)

14. Sentry, Playwright CI étendu
15. Performance / recherche PostgreSQL
16. Release checklist / rollback Vercel

---

## Ordre de correction recommandé (plan 10 phases)

| Phase | Intitulé | Prérequis baseline |
|-------|----------|-------------------|
| **0** | Baseline (ce document) | — |
| **1** | Stabilisation P0 : API, routes, sidebar, login | Build doit passer en fin de phase |
| **2** | Standardiser API / auth / erreurs | Phase 1 |
| **3** | Prisma / migrations / PostgreSQL | Phase 1 build OK |
| **4** | POS / prix / panier (sans previews) | Partiellement fait — finaliser + decoupe |
| **5** | Design system Orion | Phase 1 stable |
| **6** | Tableaux TanStack | Phase 5 amorcé |
| **7** | Data management | Phase 3 |
| **8** | Monitoring / QA / Sentry | Phase 1–2 |
| **9** | Performance / recherche | Phase 8 |
| **10** | DevOps / release / Vercel | Continu |

---

## Commandes exécutées (baseline)

```powershell
cd "C:\Users\ans\Documents\ANS CRM V3"
npm run typecheck          # KO (audit-export snapshot)
npx prisma validate        # OK
npx prisma generate        # OK
npm run build              # KO (ESLint)
npm run test               # 952/952 OK
```

`npm run audit:vercel` — non relancé (nécessite `.env.audit.local`, dernier run 01/07/2026 documenté dans `docs/VERCEL_AUTH_AUDIT.md`).

---

## Critère validation Phase 0

| Critère | Statut |
|---------|--------|
| Rapport baseline existe | OK |
| État build documenté | OK |
| État Prisma documenté | OK |
| Routes / APIs / auth / POS / UX documentés | OK |
| P0/P1/P2/P3 priorisés | OK |
| Ordre phases clair | OK |
| Aucune modification métier | OK |

**Phase 0 : VALIDÉE** — prêt pour **Phase 1 (Stabilisation P0)**.

### Premières actions Phase 1 (preview)

1. Corriger hooks `ProductPreviewEngine.tsx` (early return après hooks)
2. Corriger ESLint `prisma-enums.ts`
3. Exclure `audit-export-ans-orion` de `tsconfig.json`
4. Vérifier redirects legacy en prod
5. Auditer `/api/dashboard/summary` + messaging unread

---

*Ne pas migrer de stack. Ne pas supprimer de modules métier. Conserver `productPreviews=false`.*
