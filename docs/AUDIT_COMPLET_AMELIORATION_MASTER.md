# Audit complet — Amélioration & excellence ANS ORION

**Date :** 2026-07-05  
**Périmètre :** ERP/CRM/POS/GPAO ANS DESIGN PRINT — post Phase 3 pricing  
**Objectif :** Roadmap concrète pour rendre le projet **fiable, cohérent et « production-perfect »**

---

## 1. Résumé exécutif

ANS ORION est un **projet mature et étendu** : ~85 pages, ~327 routes API, 99 modèles Prisma, **1108 tests Vitest** (193 fichiers), 14 specs Playwright. Le build et le typecheck passent au 2026-07-05.

| Dimension | Score /5 | Tendance | Verdict |
|-----------|----------|----------|---------|
| Architecture & modularité | 4.0 | → | Solide, dualité services à unifier |
| Métier imprimerie (POS, laizes, GPAO) | 4.2 | ↑ | Très bon, pricing dynamique actif |
| Sync backoffice ↔ POS ↔ finance | 3.2 | ↑ | Outils existent, pas assez automatisés |
| Hub commande 360° | 4.0 | → | Bon centre de gravité |
| UX / parcours métier | 3.5 | → | Hub OK, POS/clients trop denses |
| UI / design system Orion | 3.6 | → | Tokens en place, incohérences mineures |
| Sécurité & permissions | 3.4 | → | Pages OK, API inégale |
| Tests & QA | 4.1 | ↑ | Vitest large, E2E partiel |
| Performance | 3.3 | → | Lazy partiel, god pages |
| RH / Finance Madagascar | 2.8 | → | À valider expert local |

**Score global pondéré : 3.6 / 5** — Projet **utilisable en production** avec réserves sur sync prix, validation manuelle des lots récents, et modules légaux non certifiés.

**Priorité absolue pour « perfection » :**  
1) Fiabilité données (prix, paiements, snapshots)  
2) Sync automatisée + CI  
3) Sécurité API homogène  
4) UX des écrans critiques (POS, commande, clients)  
5) Performance listes & bundles

---

## 2. État des lieux — ce qui est déjà excellent

| Force | Preuve |
|-------|--------|
| Hub commande unique | `/commandes/[id]`, `commande-360-view`, deep links `?commande=` |
| Moteur pricing dynamique | Prisma `ArticlePricingProfile`, formules, paliers, chips, simulate |
| Backoffice v2 | `/administration/backoffice?tab=chips\|tiers\|pricing-custom` |
| Phase 3 pricing | `_pricingSnapshot`, badge palier POS, bulk publish, audit sync API |
| Chaîne commerciale | Devis → commande → facture → paiement (services existants) |
| ANS Talk intégré | Groupes auto commande, `/messagerie` plein écran |
| Documentation | 56+ audits, roadmap lots 1–8, matrice sync |
| Règle zéro suppression | Aliases legacy, redirects middleware + next.config |
| CI de base | typecheck + vitest + playwright + build |

---

## 3. Audit par domaine

### 3.1 Architecture & dette technique

| Problème | Sévérité | Fichiers | Action |
|----------|----------|----------|--------|
| **Middleware n’intercepte pas `/api`** | P0 | `middleware.ts` L213–220 | Matcher inclut `/api/(.*)` OU audit CI obligatoire sur chaque route |
| Dual API backoffice | P1 | `app/api/backoffice/*` + `app/api/admin-backoffice/*` | Fusionner avec aliases |
| Dual entry admin UI | P1 | `/admin/pricing`, `/admin-control` vs `/administration/*` | Fin migration v2 |
| God pages | P1 | `pos/[id]/page.tsx` (~2100 L), `clients/page.tsx` (~1700 L) | Split hooks + composants |
| ~40 % logique Prisma dans routes | P1 | `app/api/**/route.ts` | Façades `lib/server/modules/*.service.ts` |
| Catalogue dual source | P1 | `lib/data/catalogue.ts` + DB | Mode `database-full` (roadmap Lot 2) |
| Cockpit API legacy | P2 | `/api/cockpit/*` | Rediriger vers `/api/dashboard/*` |
| POS previews morts | P3 | `lib/pos/features.ts`, `components/pos-preview/*` | Archiver, documenter |

### 3.2 Sync, pricing & données

| Problème | Sévérité | Détecteur | Action |
|----------|----------|-----------|--------|
| Profils brouillon non publiés | P0 | `pricing-anomalies.ts`, audit sync | Bulk publish + centre sync |
| Drift brouillon vs publié POS | P0 | `getPricingArticleDiffPos`, `pricing-sync-audit.service.ts` | Diff panel → publier |
| Formule publiée ≠ profil publié | P0 | `pricing-anomalies.ts` L96–106 | Republier formule |
| Paliers qui se chevauchent | P1 | `tierOverlap()` | Corriger onglet Paliers |
| Options impact prix sans montant | P1 | `pricing-anomalies.ts` L120–131 | Backoffice chips |
| Migration PRIX 2026 incomplète | P1 | `SalePrice2026` vs profils dynamiques | Comparateur + migration |
| Écart acompte/reste commande | P0 | `sync-drift-service.ts` `detectPaymentDrift` | `POST /api/backoffice/repair-payment-drift` |
| Config admin ↔ catalogue code | P1 | `getConfigHealth()` | `/administration/synchronisation` |
| Snapshots JSON non validés Zod | P0 | `configSnapshot` devis/commande | Enveloppe Zod v1 sur `_pricingSnapshot` |
| Scripts drift hors CI | P0 | `verify:pos-prices`, `sync:verify-drift` | Ajouter à `.github/workflows/ci.yml` |

**Outils déjà disponibles (sous-utilisés) :**

```
GET  /api/admin-backoffice/pricing/audit
GET  /api/backoffice/sync-diagnostics
POST /api/admin-backoffice/pricing/publish-bulk
POST /api/backoffice/repair-payment-drift
npm run verify:pos-prices
npm run sync:verify-drift
npm run perf:audit
```

### 3.3 Sécurité & permissions

| Problème | Sévérité | Détail | Action |
|----------|----------|--------|--------|
| API auth handler-by-handler | P0 | Matcher exclut `/api` | Standardiser `withAuthApi` sur ~327 routes |
| Rôle fantôme `finance` | P1 | `page-access.ts` vs `permissions.ts` | Aligner rôles |
| Rôle inconnu → permissions `user` | P1 | `permissions.ts` L71 | Fail-closed ou rôle minimal |
| Page ACL partielle | P1 | `/factures`, `/pos` ouverts à tout auth | Étendre `page-access.ts` |
| RH gate fail-open serveur | P1 | `late-arrival-service.ts` | Fail-closed sur erreur interne |
| Session 401 polling | P1 | ANS Talk, nav badges | Handler global fetch 401 |
| `withAuthApi` adoption faible | P1 | ~7 fichiers vs 327 routes | Migration progressive |
| Routes publiques intentionnelles | OK | `/api/health`, `/api/auth/*`, `/api/bat/client/*` | Documenter allowlist |

### 3.4 UX & parcours métier

| Écran / flux | Score | Problème | Amélioration |
|--------------|-------|----------|--------------|
| Hub commande | 4/5 | Bon | Generaliser `flow-context-banner` partout |
| POS configurateur | 3/5 | Dense, long chargement | Lazy par famille produit |
| Clients | 3/5 | Monolithe list+detail | Split URL `/clients/[id]` |
| Devis | 3.5/5 | Snapshots enrichis récents | Afficher moteur + palier (fait Phase 3) |
| Dashboard | 3.5/5 | 6 slices parallèles | Banner degraded + retry |
| Backoffice | 4/5 | v2 solide | Sync status visible partout |
| ANS Talk | 3/5 | Polling, 401 silencieux | WebSocket P3, fix 401 P1 |
| RH / Paie | 2.5/5 | Non certifié légal Mada | Expert local obligatoire |

**Legacy URLs (corrigées middleware, à re-valider prod) :**

| Legacy | Canonique |
|--------|-----------|
| `/cockpit` | `/dashboard` |
| `/crm/clients` | `/clients` |
| `/catalogue-pos` | `/pos` |
| `/communication/ans-talk` | `/messagerie` |
| `/finance/factures` | `/factures` |

Action : `npm run audit:vercel` + test E2E redirects.

### 3.5 UI & design system

| Item | Statut | Action |
|------|--------|--------|
| Tokens Orion (rouge #cc0033, radius 7px) | ✅ | Continuer migration composants legacy |
| Status colors unifiés | 🔄 | `status-styles.ts` — généraliser |
| Contraste AA | 🔄 | Voir `AUDIT_360_COLOR_ACCESSIBILITY.md` |
| Typographie / icônes | 🔄 | Voir `AUDIT_360_TYPOGRAPHY_ICONS.md` |
| Toasts / feedback | 🔄 | `uxToast` partout, plus d’erreurs brutes API |
| Empty states | 🔄 | Inégaux hors dashboard |

### 3.6 Base de données & Prisma

| Item | Statut | Risque | Action |
|------|--------|--------|--------|
| 99 modèles, 6 enums | ✅ | 25+ statuts encore `String` | Migration enums P2 |
| Dual SQLite local / Postgres prod | ✅ | Drift schema si mal discipliné | `migrate deploy` prod only |
| 5 migrations versionnées | ✅ | — | Continuer |
| JSON snapshots | 🔄 | Pas de validation stricte | Zod envelope |
| Panier localStorage | Info | Pas de reprise multi-device | Optionnel : draft DB |
| Index messaging/commandes | 🔄 | Perf listes | Migration index P2 |

### 3.7 Performance

| Risque | Sévérité | Fichier | Mitigation |
|--------|----------|---------|------------|
| Bundle POS | P1 | `pos/[id]/page.tsx` | Code-split par famille |
| Clients monolith | P1 | `clients/page.tsx` | Virtualisation + split |
| Listes > 50 lignes | P1 | commandes, stock | `useWindowedRows` |
| Polling permanent | P2 | messagerie, badges | Backoff + visibility API |
| Recharts bundle | P2 | dashboard | `optimizePackageImports` (partiel) |
| config-types.ts massif | P2 | `lib/data/config-types.ts` | Split par famille |

Commandes : `npm run perf:audit`, `npm run analyze`

### 3.8 Tests & CI

| Couverture | Statut |
|------------|--------|
| Vitest 1108 tests / 193 fichiers | ✅ Excellent pricing, sync, permissions |
| Playwright 14 specs | 🔄 Smoke + chaine commerciale partielle |
| E2E par rôle | ❌ Manquant |
| admin-backoffice v2 APIs | ❌ Peu testées |
| verify:pos-prices en CI | ❌ Manquant |
| Legacy redirect regression | ❌ Manquant |
| Validation Zod routes | 🔄 Partiel |

### 3.9 Déploiement & ops

| Cible | Config | Notes |
|-------|--------|-------|
| Vercel | `vercel.json` | Preview + crons |
| Hostinger | `scripts/guard-hostinger-deploy.mjs` | Prod Node.js + Neon Postgres |
| Local | `npm run dev:local` port 3020 | Cache `.next` — voir `NEXT_ASSETS_404_RAW_HTML_FIX.md` |
| Netlify | Absent | Skills Netlify = migration future seulement |

---

## 4. Matrice « Perfect » — critères de fin

Le projet sera considéré **production-perfect** quand :

| # | Critère | Mesure de succès |
|---|---------|------------------|
| 1 | **Prix POS = backoffice publié** | `verify:pos-prices` vert en CI + 0 drift critical |
| 2 | **Paiements = vérité ledger** | `detectPaymentDrift` = 0 sur échantillon prod |
| 3 | **Snapshots validés** | Zod sur `_pricingSnapshot`, tests devis/commande |
| 4 | **API 100 % authentifiées** | Audit CI : chaque route dans allowlist ou auth |
| 5 | **Hub commande complet** | next-action, facture auto, flow banner sur 100 % modules liés |
| 6 | **Listes performantes** | Virtualisation commandes/stock/clients > 50 lignes |
| 7 | **E2E rôle matrix** | commercial, production, caisse, lecture — accès validés |
| 8 | **Legacy 0×404** | Tous redirects 308 testés prod |
| 9 | **Design cohérent** | 95 % écrans tokens Orion, contrast AA |
| 10 | **Docs = réalité** | Roadmap lots 6–8 clos, MODULES_MAP à jour |

---

## 5. Top 30 améliorations priorisées

### P0 — Critique (1–2 semaines)

| # | Action | Fichiers / commandes |
|---|--------|----------------------|
| 1 | CI pricing drift | `.github/workflows/ci.yml` + `verify:pos-prices` + `sync:verify-drift` |
| 2 | Zod snapshots panier/devis/commande | `lib/validators/pricing-snapshot.ts`, `cart-service.ts` |
| 3 | Audit auth API automatisé | Script grep + allowlist `middleware.ts` PUBLIC_* |
| 4 | Repair payment drift UI | Bouton centre sync → `repair-payment-drift` |
| 5 | Re-valider redirects legacy prod | `npm run audit:vercel`, `e2e/navigation.spec.ts` |
| 6 | Publier profils brouillon restants | Bulk publish + audit sync hebdo |

### P1 — Important (2–4 semaines)

| # | Action |
|---|--------|
| 7 | Fusion API `backoffice` → `admin-backoffice` |
| 8 | Split POS god page (hooks + lazy families) |
| 9 | Split clients list/detail |
| 10 | Virtualiser commandes + stock |
| 11 | Migrer catalogue `database-full` |
| 12 | Standardiser `withAuthApi` sur routes P1 (finance, messaging, cart) |
| 13 | RH late-arrival fail-closed serveur |
| 14 | Global 401 handler (toast + redirect) |
| 15 | Fix rôle `finance` fantôme |
| 16 | Fin migration UI admin legacy |
| 17 | Dashboard degraded UX (retry banner) |
| 18 | Export comptable CSV factures/paiements |

### P2 — Amélioration (1–2 mois)

| # | Action |
|---|--------|
| 19 | Enums Prisma pour statuts String |
| 20 | E2E role-access.spec.ts |
| 21 | Deprecate `/api/cockpit/*` |
| 22 | Index DB messaging + commandes |
| 23 | Lazy ANS Talk + backoff polling |
| 24 | Contraste AA audit complet |
| 25 | GPAO auto-dossier E2E |
| 26 | Relances CRM auto |
| 27 | Transporteurs Madagascar logistique |
| 28 | Storybook composants Orion |

### P3 — Vision (ongoing)

| # | Action |
|---|--------|
| 29 | WebSocket ANS Talk |
| 30 | Portail client + BI forecasting |
| 31 | e-Déclaration DGI Madagascar |
| 32 | Upgrade Next.js 15+ |
| 33 | 2FA optionnel |
| 34 | Archive POS preview code |

---

## 6. Plan d'exécution en 5 vagues

```
Vague A — Fiabilité données (2 sem)
├── CI verify:pos-prices + sync:verify-drift
├── Zod _pricingSnapshot
├── Payment drift repair workflow
└── Audit sync hebdomadaire automatisé

Vague B — Sécurité & API (2 sem)
├── Audit auth routes + withAuthApi migration P1
├── Middleware API matcher OU CI gate
├── Global 401 handler
└── RH fail-closed serveur

Vague C — UX écrans critiques (3 sem)
├── Split POS + lazy families
├── Split clients + virtualisation listes
├── Flow banner generalization
└── Dashboard degraded states

Vague D — Architecture & sync (3 sem)
├── Fusion backoffice APIs
├── Catalogue database-full
├── Fin admin legacy UI
└── Façades services routes restantes

Vague E — Excellence & conformité (ongoing)
├── E2E role matrix
├── Export comptable
├── Expert RH/Finance Madagascar
├── Performance perf:audit targets
└── Design AA + Storybook
```

---

## 7. Checklist hebdomadaire opérateur

```bash
# 1. Santé build
npm run typecheck && npm run test

# 2. Drift prix
npm run verify:pos-prices
npm run sync:verify-drift

# 3. Audit sync (UI ou API)
curl -s /api/admin-backoffice/pricing/audit  # avec session admin

# 4. Payment drift
curl -s /api/backoffice/sync-diagnostics

# 5. Perf (mensuel)
npm run perf:audit
```

---

## 8. Index documentation existante

| Thème | Documents clés |
|-------|----------------|
| Synthèse 360 | `AUDIT_360_FINAL_MASTER_PLAN.md` |
| Architecture | `ARCHITECTURE.md`, `BACKEND_ARCHITECTURE_AUDIT.md` |
| Roadmap | `ROADMAP_EXECUTION.md` (lots 1–8) |
| Sync | `SYNC_MATRIX.md`, `PHASE3_SYNC_ANOMALIES_AUDIT.md` |
| Pricing | `PRICING_CUSTOM_ARTICLES_FULL_AUDIT.md`, `CUSTOM_ARTICLES_PRICING_FINAL_REPORT.md` |
| UX | `UX_AUDIT_GLOBAL.md`, `USER_JOURNEYS.md` |
| Sécurité | `SECURITY.md`, `VERCEL_AUTH_AUDIT.md` |
| Performance | `PERFORMANCE.md` |
| Bundle export | `audit-export-ans-orion/10_FINAL_RECOMMENDATIONS.md` |
| Benchmark | `BENCHMARK_GLOBAL_PRINT_CRM_ERP_BI_REPORT.md` |

---

## 9. Verdict final

ANS ORION n’est **pas un prototype** : c’est un ERP métier **riche et opérationnel**. Pour le rendre **perfect** :

1. **Automatiser** ce qui est déjà détecté (prix, paiements, sync) — ne pas compter sur l’humain seul.
2. **Réduire** la dualité (catalogue, backoffice API, admin UI, services).
3. **Scinder** les god pages POS/clients pour maintenabilité.
4. **Homogénéiser** sécurité API et feedback UX.
5. **Valider** RH/fiscalité Madagascar avec un expert local — hors scope purement technique.

**Prochaine action recommandée :** Vague A (items P0 #1–6) — 1 sprint de 5 jours avec impact business maximal.

---

*Généré le 2026-07-05 — synthèse de 56 audits docs + exploration codebase + 1108 tests verts.*
