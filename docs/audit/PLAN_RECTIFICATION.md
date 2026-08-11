# Plan de rectification — ANS ORION

| Date | 2026-07-18 |
|------|------------|
| Entrée | Mega-prompt audit + session locale |

## Lots

| Lot | Anomalies | Correction | Risque | Rollback | Statut |
|-----|-----------|------------|--------|----------|--------|
| **0** | DB-001, DATA-001 path | Docs + URL sqlite + inventaire sauvegardes | Faible | — | **Fait (doc)** |
| **1** | PERF-001, baseline | `engines` Node ; typecheck | Faible | — | **Fait** |
| **2** | SEC-001…008 auth | Middleware API, secret, démo, cookies, stock perms | Moyen | Revert fichiers | **Fait (code+tests)** — pas de mutation DB |
| **3** | BILL / prix | Golden tests pricingResolver (pures) | Moyen | Revert fichier test | **Fait (tests)** — pas de mutation DB ; 0 bug code |
| **4** | STOCK / sync | Idempotence mouvements + réservations | Moyen | Revert fichiers | **Fait (code+tests)** — pas de seed |
| **5** | SYNC conflits | Double vente / prix / paiement (scénarios) | Moyen | Revert | **Fait (A→F + VF-QA01)** — gardes code ; concurrence DB réelle NON EXÉCUTÉE |
| **VF-00** | Baseline RC | typecheck / tests / auth / build / docs | Faible | — | **Fait** |
| **VF-P0A** | data-loss deploy | Fail-closed vercel/neon/setup | Moyen | Revert scripts | **Fait** |
| **VF-P0B** | Catalogue POS | Lecture pure getPosCatalogue | Moyen | Revert service | **Fait** |
| **VF-QA01** | Preuves | Tests comportementaux | Faible | Revert tests | **Fait** |
| **VF-P1** | Radius / finance nav / docs | 7px + role finance | Faible | Revert | **Fait** |
| **VF-P2/P3** | Perf/UI/RC | Budgets + checklist | Faible | — | **Fait (doc)** — p95 staging ouvert |
| **V2-00** | Reprise Vague 2 | `VAGUE_2_ETAT_REPRISE.md` + baseline | Faible | — | **Fait (doc)** |
| **V2-01** | Auth OR-escalation | Write perms ; setup-db ; imports ; equipe | Moyen | Revert routes | **Fait (P0 + equipe)** |
| **V2-H** | Hostinger RC | Build/prestart/docs sans data-loss | Moyen | — | **Fait (code+doc)** — **NO-GO prod** |
| **V2-03** | Moteur prix | Canon + source POS + MGA | Moyen | Revert | **Fait (code+tests+doc)** |
| **V2-04** | Sync Admin/POS | Contrat champs + recette | Faible | — | **Fait (doc)** — E2E base isolée NON EXÉCUTÉ |
| **V2-05 / D-011** | Stock/prod | TX adjust, oversell, release Annulée, consommation Prête/Livré | Moyen | Revert | **Fait (code+tests)** |
| **V2-06 / 06b** | Finance | Accepté PUT, paiement ref, caisse, MGA, overpay update, verrou facture | Moyen | Revert | **Fait (P0/P1)** |
| **V2-02R** | Référentiel V17 | Matrices RACI/registres/statuts (sans PDF) | Faible | — | **Fait (doc)** — PDF MANQUANTS |
| **V2-07** | API doublons | Re-exports + sync publish | Faible | Revert | **Fait (aliases)** |
| **V2-08** | UX | Recette ; sim/versions déjà redirigés | Faible | — | **Fait (doc)** |
| **V2-10** | RC | Rapport + checklist | — | — | **GO STAGING / NO-GO PROD** |
| **V2-RC Auth** | Auth/RBAC | Scan 387 routes + refus démo/lecture | Faible | Revert test/docs | **Fait — 40 tests OK** |
| **V2-05b** | Réception achat | TX globale stock + lignes + statut ; sync post-commit | Moyen | Revert services | **Fait — 36 tests stock OK** |
| **11** | Deploy / migrate PG | **Bloqué** jusqu’à backup + D-005 | — | — | Attente |

## Critères de sortie Lot 0–1

- [x] Typecheck 0 erreur
- [x] Prisma validate OK
- [x] Docs audit Phase 0
- [x] `engines` Node
- [x] `npm test` ciblé pricing + auth smoke (Lot 2 + Lot 3)
- [x] Décision Git documentée (pas d’init)

## Critères de sortie Lot 3

- [x] Golden tests qty / paliers / volume / promo / surface GF / dynamic mock
- [x] Vitest `tests/pricing-resolver-golden.test.ts` — 43 OK
- [x] Aucune écriture DB / seed / migrate

## Critères de sortie Lot 4

- [x] Helpers purs `stock-quantity` (dispo, delta, cohérence)
- [x] Idempotence `adjustStock` si référence (replay)
- [x] Idempotence `reserveStock` par article × commande active
- [x] Vitest `tests/lot4-stock-idempotence.test.ts` + guards — 28 OK
- [x] Aucun seed / migrate / mutation métier

## Interdits jusqu’à validation

- `prisma migrate reset` / truncate
- Seed sur base considérée « réelle »
- Connexion écriture Neon/Hostinger
- Suppression modules métier
