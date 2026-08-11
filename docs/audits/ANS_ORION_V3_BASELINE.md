# ANS ORION V3 — Baseline (Phase 0)

**Date de mesure :** 2026-07-30 ~09:43–09:45 (UTC+3)  
**Racine :** `C:\Users\ans\Desktop\2em-export-complet-UNIQUE`  
**Git :** NON APPLICABLE (pas de `.git`)  
**Pré-remédiation :** `docs/audits/ANS_ORION_V3_PRE_REMEDIATION.md`  
**Backup :** `C:\Users\ans\Desktop\ANS_ORION_V3_BACKUP_20260730-094413`

---

## 1. Environnement

| Item | Mesure |
|------|--------|
| Node | v24.15.0 |
| npm | 11.12.1 |
| Framework | Next.js 14 |
| ORM | Prisma · schema `provider = "sqlite"` (dev) |
| Package manager | npm (`package-lock.json`) |
| Conventions | `.cursor/rules/*`, `docs/`, `README.md`, `README_LOCAL.md` |

### Scripts réellement disponibles (extrait pertinent)

`lint`, `typecheck`, `test` / `test:local` (vitest), `test:ci`, `test:e2e`, `test:e2e:smoke`, `test:e2e:audit-p0`, `test:e2e:finance`, `test:e2e:modules`, `build`, `build:local`, `e2e:server`, `seed`, `db:*`, `check:env`, `sanitize:secrets`

Pas de script `format` dédié trouvé dans le haut de `package.json`.

---

## 2. Compteurs mesurés

| Métrique | Audit V2 déclaré | Mesure V3 | Écart |
|----------|------------------|-----------|-------|
| Pages (`app/**/page.tsx`) | 136 | **136** | = |
| Routes API (`app/api/**/route.ts`) | 394 | **394** | = |
| Modèles Prisma (`^model`) | 155 | **155** | = |
| Fichiers tests (`tests/**/*.test.*`) | 313 | **315** | +2 |
| Specs E2E (`e2e/**/*.spec.ts` + setup) | — | **23** | — |
| POS `[id]/page.tsx` lignes (Count) | ~2609 | **2751** raw / **2609** non-vides | ≈ |
| `prixDepart` dans `lib/data/catalogue.ts` | 99 | **99** | = |
| `requireAdmin*` dans `app/api/**/route.ts` | 0 | **0** | = |
| Fichiers API avec `requirePermission` | — | **214** | — |
| Catch vides `page.tsx` app | 0 | **0** (rg) | = |
| Macros Admin (`overview`…`org`) | 7 code / 6 docs | **7** code | docs stale |
| `prisma/e2e.db` | canonique | présent ~6 Mo | OK |
| `prisma/prisma/e2e.db` | bug V2 | **absent** | CORRIGÉ V2 |

---

## 3. Fichiers cités — existence

| Fichier | Statut |
|---------|--------|
| `components/layout/sidebar/sidebar-universe-nav.tsx` | EXISTS |
| `components/layout/orion-sidebar.tsx` | EXISTS |
| `components/administration/AdministrationMacroNav.tsx` | EXISTS |
| `components/backoffice-v2/ui/AdminMicroContextDropdown.tsx` | EXISTS |
| `lib/navigation/build-sidebar-universes.ts` | EXISTS |
| `lib/navigation/sidebar-universes.ts` | EXISTS |
| `lib/navigation/sidebar-active.ts` | EXISTS |
| `lib/navigation/nav-badges-shared.ts` | EXISTS |
| `lib/navigation/nav-badges-service.ts` | EXISTS |
| `lib/hooks/use-admin-macro-badge-counts.ts` | EXISTS |
| `lib/administration/admin-macro-modules.ts` | EXISTS |
| `lib/administration/backoffice-redirects.ts` | EXISTS |
| `lib/modules/role-registry.ts` | EXISTS |
| `lib/modules/module-registry.ts` | EXISTS |
| `data/admin-nav-config.json` | EXISTS |
| `lib/page-access.ts` | EXISTS |
| `lib/auth/page-access.ts` | **MISSING** (canon = `lib/page-access.ts`) |
| `styles/sidebar-modern.css` | EXISTS |
| `lib/stock/en-attente-stock-rule.ts` | EXISTS |

---

## 4. État des constats (revalidés code)

| ID | Constat | Preuve | État V3 |
|----|---------|--------|---------|
| V3-A1 | Secrets runtime littéraux | Tests `prompt-p0-security` verts ; `local-auth` lit env | **DÉJÀ CORRIGÉ** (revalider à chaque lot) |
| V3-A2 | setup-db prod | `app/api/setup-db/route.ts` : 404 si `isProductionDeploy()` / `NODE_ENV===production` | **DÉJÀ CORRIGÉ** |
| V3-A3 | requireAdmin API | 0 hits `route.ts` | **DÉJÀ CORRIGÉ** |
| V3-S1 | Admin sidebar sans filtre rôle | `build-sidebar-universes.ts` L53–63 : toujours `adminNav: true` | **CONFIRMÉ** — P0 |
| V3-S2 | MacroNav sans gate | `AdministrationMacroNav` mappe `ADMIN_MACRO_MODULES` sans rôle | **CONFIRMÉ** — P0 |
| V3-S3 | Non-admin → liens → `/non-autorise` | `page-access` `/administration` = admin\|manager seulement | **CONFIRMÉ** — P0 |
| V3-S4 | `canAccessAdmin` existe mais non utilisé sidebar | `permission-matrix.ts` flag ; 0 usage dans `lib/navigation` | **CONFIRMÉ** |
| V3-C1 | Flow Commercial 1–6 | `COMMERCIAL_FLOW_ORDER` length 6 | **CONFIRMÉ** |
| V3-C2 | Étape vs badge confusable | `.orion-sb-flow-step` + `SidebarBadge` | **CONFIRMÉ** — P1 |
| V3-C3 | Réclamations absente profil commercial | `role-registry` commercial L140–144 sans `reclamations` ; matrix sans clé | **CONFIRMÉ** — P1 (décision métier) |
| V3-D1 | Docs 6 macros vs 7 code | `MODULES_MAP.md` L51 « 6 macros » ; 7 ids dans `admin-macro-modules` | **CONFIRMÉ** — P1 docs |
| V3-D2 | Badge parent Admin = 0 | `sumUniverseBadge` sur `items: []` | **CONFIRMÉ** — P1 |
| V3-P1 | prixDepart seed 99 | `catalogue.ts:99` | **CONFIRMÉ** seed ; runtime POS déjà testé sans fallback |
| V3-K1 | En attente stock | rule + `stock-attente-mapping` tests | **DÉJÀ CORRIGÉ** (revalider) |
| V3-E1 | Catch vides pages | 0 | **DÉJÀ CORRIGÉ** |
| V3-E2 | E2E smoke 16/16 | Annoncé V2 ; **non rejoué** dans cette Phase 0 | **À REJOUER** |
| V3-M1 | POS monolithe | 2751 lignes | **CONFIRMÉ** dette P2 |
| V3-G1 | Pas de git | — | **NON APPLICABLE** |

---

## 5. Preuves clés (extraits)

### Admin toujours injecté

```53:63:lib/navigation/build-sidebar-universes.ts
    if (def.id === 'administration') {
      result.push({
        id: def.id,
        …
        items: [],
        adminNav: true,
      });
      continue;
    }
```

### Page access Admin

```30:30:lib/page-access.ts
  { path: '/administration', roles: ['admin', 'manager'] },
```

### Commercial sans réclamations

Profil `commercial` nav : clients, pos, panier, devis, commandes — **pas** `reclamations`.

### Flow 6

```156:163:lib/navigation/sidebar-universes.ts
export const COMMERCIAL_FLOW_ORDER = [
  'clients', 'pos', 'panier', 'devis', 'commandes', 'reclamations',
] as const;
```

---

## 6. Tests baseline (Phase 0)

| Commande | Date | Exit | Résultat |
|----------|------|------|----------|
| `npx vitest run` (7 fichiers p0/lot4/catch/nav/stock/pos/database-url) | 2026-07-30 | **0** | **23 passed** / 0 failed / ~959 ms |
| `npm run lint` | — | **non exécuté** Phase 0 (sera lot) | — |
| `npm run typecheck` | — | non exécuté Phase 0 | — |
| `npm run test:e2e:smoke` | — | **non rejoué** Phase 0 | — |
| `npm run build` | — | non exécuté Phase 0 | — |

---

## 7. Écarts audits V2 vs dépôt courant

| Annonce V2 | Réalité V3 |
|------------|------------|
| Sidebar Admin « OK navigation » | **Fuite menu Admin toujours vraie** |
| E2E 16/16 | Non revalidé dans Phase 0 (DB path fix présent) |
| Docs macros à jour | **MODULES_MAP encore « 6 macros »** |
| deps mortes purgées | Inventaire doc OK ; pas re-scan depcheck Phase 0 |
| Note ~9/10 | **Sidebar P0 invalide une note haute** jusqu’à correction |

---

## 8. Décision Phase 0 → corrections

**Baseline validée.** Autorisation de démarrer les lots métier, en commençant par :

1. **P0** `canAccessAdministration` + filtre `buildSidebarUniverses` + gate `AdministrationMacroNav` + tests  
2. **P1** flow Commercial (étapes visibles + a11y) + docs 7 macros + badge parent  
3. Puis revalidation sécurité/prix/stock/E2E selon matrice

**Note provisoire avant correction P0 sidebar : ~7,5/10** (P0 menu Admin ouvert).
