# AUDIT 360 — Phase 0 : Baseline & sécurité de l’audit

Date : 2026-07-04  
Projet : ANS ORION / ANS CRM V3  
Méthode : lecture codebase + commandes de validation (sans modification métier)

---

## Stack détectée

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 14 App Router, React 18, TypeScript |
| Styles | Tailwind CSS, design tokens Orion (`--orion-radius`, rouge `#cc0033`) |
| Auth | NextAuth (JWT cookie), `middleware.ts`, `lib/page-access.ts` |
| ORM | Prisma 6.7 |
| DB | PostgreSQL/Neon (prod), SQLite demo local |
| Tests | Vitest (~991 tests), Playwright E2E |
| Deploy | Hostinger Node.js + preview Vercel |

---

## Modules existants (11 univers sidebar)

Pilotage · Ventes & CRM · Studio & BAT · Production/GPAO · Stock & Achats · Machines & Maintenance · Logistique · Finance · RH · Communication · Administration · Mon espace

- **Registry :** `lib/modules/module-registry.ts` — 83 modules (76 actifs)
- **Rôles :** `lib/modules/role-registry.ts` — 12 profils
- **Hub central :** `/commandes/[id]` — `commande-360-service.ts`

---

## Routes principales

| Type | Volume |
|------|--------|
| Pages authentifiées `app/(app)/` | ~85 |
| API `app/api/**/route.ts` | 224 |

Domaines API : clients, devis, commandes, cart, pricing, dynamic-pricing, paiements, factures, stock, production, rh, messaging, dashboard, backoffice, admin-config, health, cron.

---

## Prisma

- **Modèles :** 99 (`prisma/schema.prisma`)
- **Migrations :** baseline + 3 incrémentales (état 2026 — corrige doc obsolète « sans migrations »)
- **Validation :** `npx prisma validate` ✅ (2026-07-04)

Entités clés : Client, Devis, Commande, Facture, Paiement, Livraison, ProductionDossier, StockItem, Employee, TalkConversation, ArticlePricingProfile, ProductOptionGroup.

---

## Commandes de validation exécutées

| Commande | Résultat |
|----------|----------|
| `npm run typecheck` | ✅ OK |
| `npx prisma validate` | ✅ OK |
| `npm run test` | ⚠️ 990/991 OK — 1 test finition coins (corrigé post-audit : règle descriptive) |
| `npm run build` | ✅ OK (session précédente) |
| `npm run audit:vercel` | Script présent — à lancer en CI |
| `npm run dev:local` | Disponible |

---

## Erreurs / anomalies actuelles

| ID | Priorité | Description |
|----|----------|-------------|
| E1 | P2 | 1 test Vitest en échec avant correction (`finition-modules` — attente legacy coins×count) |
| E2 | P1 | ~90+ routes API appellent Prisma directement (`BACKEND_ARCHITECTURE_AUDIT.md`) |
| E3 | P1 | Catalogue partiellement code-first (`lib/data/catalogue.ts`) vs DB dynamique |
| E4 | P1 | Dual admin legacy : `/admin/pricing`, `/admin-control` + `/administration/*` |
| E5 | P2 | Middleware API : pas de JWT global — auth par route (`requirePermission`) |
| E6 | P2 | RH late-arrival gate : fail-open serveur documenté (`FULL_AUDIT_SYNC_REPORT`) |
| E7 | P3 | Next.js 14.2.28 — alerte sécurité npm (upgrade recommandé P2) |
| E8 | P2 | Checklists validation manuelle POS/paiement/backoffice non signées |

---

## Risques critiques (P0)

Aucun P0 bloquant détecté au build/typecheck actuel.

**Surveillance P0 :**
- Paiement commande sans `factureId` — corrigé récemment (`syncCommandeLinkedFacturesFromPayments`)
- Impact prix POS — lot récent ; validation manuelle POS requise
- Pas de migration destructive en cours

---

## Priorités audit

| Niveau | Focus |
|--------|-------|
| **P0** | Build, auth session, paiement/prix exacts, perte données |
| **P1** | Sync backoffice→POS, hub commande complet, KPI dashboard, APIs fragiles |
| **P2** | UX/UI, performance, exports, design system, tests E2E étendus |
| **P3** | BI avancée, intégrations transport Mada, n8n, mobile natif |

---

## Recommandations immédiates (sans correction code)

1. Valider manuellement le lot paiement commande + impact prix POS (checklist `POS_VARIABLES_PRICE_IMPACT_FINAL_REPORT.md`).
2. Lancer `npm run audit:vercel` et `test:e2e:smoke` avant prochain déploiement prod.
3. Traiter P1 sync drift via Centre sync `/administration/synchronisation`.
4. Planifier upgrade Next.js patch sécurité.
5. Poursuivre Phases 1–17 → `docs/AUDIT_360_FINAL_MASTER_PLAN.md`.

---

*Phase 0 terminée — aucune modification métier appliquée dans ce document.*
