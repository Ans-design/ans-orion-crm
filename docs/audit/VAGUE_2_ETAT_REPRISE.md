# Vague 2 — État de reprise (V2-00)

| Date | 2026-07-18 |
|------|------------|
| Copie | `C:\Users\ans\Documents\ANS OKOK TATY AORIAN\PROJET AVANT FINAL` |
| Git | **absent** (pas d’init — décision propriétaire) |
| Prompts | Vague 2 standard + édition enrichie V17 |

## 1. Dossier canonique

| Retenu | Exclus |
|--------|--------|
| Dossier ouvert (sentinelles `package.json`, `app/`, `lib/`, `components/`, `prisma/` OK) | `$ExportFolder`, caches Chrome/Playwright, copies imbriquées, `deploy/` comme source de vérité code |

## 2. Documents 1ʳᵉ vague trouvés

`ETAT_INITIAL_PROJET`, `ARCHITECTURE_ACTUELLE_DETAILLEE`, `INVENTAIRE_MODULES_CRM_ERP`, `AUDIT_CRM_ERP`, `PLAN_RECTIFICATION`, `RAPPORT_SECURITE`, `MATRICE_SYNCHRONISATION_DONNEES`, `CHANGELOG_CORRECTIONS`, `DECISIONS_EN_ATTENTE`, `INVENTAIRE_SAUVEGARDES`, `README`.

Absents / non créés en V1 : `RAPPORT_QUALITE_DONNEES`, `RAPPORT_TESTS` (à produire en V2).

## 3. Corrections annoncées — statut réel

| ID | Anomalie | Gravité | Correction annoncée | Preuve code/test | Statut réel | Action V2 |
|----|----------|---------|---------------------|------------------|-------------|-----------|
| SEC-001 | Middleware sans `/api` | P0 | matcher API | `lib/middleware-matcher.ts` + Lot2 tests | **confirmé corrigé** | Maintenir |
| SEC-002 | Secret NextAuth fallback prod | P0 | fail-closed | `lib/auth-secret.ts` | **confirmé corrigé** | Maintenir |
| SEC-003 | Démo auto Vercel | P0 | flags explicites | `lib/auth-environment.ts` | **confirmé corrigé** | Maintenir |
| SEC-004 | Rôle demo trop large | P0 | permissions restreintes | `lib/auth/permissions.ts` | **confirmé corrigé** | Maintenir |
| SEC-005 | E2E_MODE bypass Hostinger | P0 | durcissement | auth-environment / cookies | **confirmé corrigé** | Maintenir |
| BILL-L3 | Prix sans golden | P1 | golden tests | `tests/pricing-resolver-golden.test.ts` | **confirmé corrigé** (TS fixtures fix V2) | Maintenir |
| STOCK-L4 | Idempotence stock | P1 | helpers + gardes | `stock-quantity.ts`, Lot4 tests | **confirmé corrigé** | Maintenir |
| DB-001 | Drift sqlite/pg | P0 | doc + patch build | schema sqlite + generate Hostinger | **correction partielle** | Plan PG + Hostinger fail-closed |
| DATA-001 | Formules custom perdues | P0 | inventaire | pas de backup métier | **bloqué par données** | V2-02 lecture seule |
| AUTH-OR | `config:view` OR écriture | P0 | — | découvert V2 | **confirmé corrigé** (cette session) | Tests V2 |
| HOST-BUILD | `db push --accept-data-loss` | P0 | — | `hostinger-build.mjs` | **confirmé corrigé** | Docs RC |
| SETUP-DB | setup-db prod ouvert | P0 | — | `setup-db/route.ts` | **confirmé corrigé** | ALLOW_SETUP_DB |

## 4. Baseline (session Vague 2)

| Commande | Résultat | Notes |
|----------|----------|-------|
| Sentinelles | OK | Pas de `.git` |
| `npx prisma validate` | **exit 0** | Schema valide |
| `npm run typecheck` | **exit 0** | Fixtures Lot3 corrigées |
| Lint | NON EXÉCUTÉ | — |
| Tests ciblés V2+L2–4 | **89 OK** | v2-guards, lot2, lot3 golden, lot4 |
| Build local | NON EXÉCUTÉ | Long — à lancer avant staging |
| E2E smoke | NON EXÉCUTÉ | Env isolé requis |
| PDF V17 | **MANQUANT** dans le workspace | Exiger ajout `docs/references/` |

## 5. P0 / P1 ouverts

| Priorité | Sujet |
|----------|-------|
| P0 | Backup métier restaurable **MANQUANT** → pas de migrate/seed prod |
| P0 | Drift Prisma sqlite source / postgres prod (patch au build) — plan transition |
| P1 | Matrice RBAC exhaustive 387 routes (échantillon critique fait) |
| P1 | Procédure Hostinger RC + rollback DB documenté |
| P1 | Formules custom absentes — fiches validation métier |
| P2 | Lots sync Admin/POS, finance invariants, UX V2-08 |

## 6. Routes critiques traitées en premier (V2-01)

Imports Excel, backfill, repair-payment-drift, base-materials POST/sync, setup-db, packaging `?seed=1`.

## 7. Inventaire sauvegardes

Voir `INVENTAIRE_SAUVEGARDES.md` — **aucune** sauvegarde métier restaurable confirmée.

## 8. Opérations bloquées

- `prisma migrate` / `db push` sur base non identifiée
- Seed / backfill / repair écriture
- Changement provider Prisma source
- Déploiement Hostinger réel sans `ALLOW_HOSTINGER_DEPLOY` + validation propriétaire
- GO PRODUCTION sans backup
- Codage aveugle C01–C06 (sanctions, paie, HSE) sans PDF + validation juridique

## 9. Avancement Vague 2 (fin session)

| Lot | Statut |
|-----|--------|
| V2-00 → V2-01 | **Fait** (Hostinger guards + auth P0) |
| V2-02 | **Fait** (docs lecture seule) |
| V2-02R | **Fait (doc)** — PDF V17 absents ; matrices provisoires |
| V2-03 → V2-07 | **Fait** (prix, sync doc, stock/finance, API aliases) |
| V2-05 / D-011 | **Fait** — `release` Annulée ; `consumeReservationsForCommande` sur **Prête** / **Livré** (+ jalons) |
| V2-06b finance | **Fait** — overpay update ; ensureFacture + snapshot ; verrou Emise meta ; unwrap listes |
| V2-RC Auth | **Fait** — scan Auth 387 routes ; refus écritures démo/lecture ; conversion devis anti-double |
| V2-05b achats | **Fait** — réception achat atomique ; mouvements et statut dans une TX ; sync post-commit |
| B-08 erreurs API | **Fait** — messages structurés lisibles ; liste devis `unwrapPaginated` ; unwrap clés devis/factures/… |
| B-09 double-submit | **Fait** — gardes UI finance/prod/livraison ; claim réception achat ; planning unwrap |
| B-10 suite | **Fait** — create achats/planning/fournisseurs ; messages hub kanban/workflow + sync |
| V2-08 → V2-10 | **Fait** — verdict **GO STAGING (doc) / NO-GO PROD** |
| Vague A→F audit | **Fait** — finance canon, concurrence, workflow BAT/paiement, sécu/pagination/RH, UX Talk/tokens, docs STRICT_POS |

## 10. Prochaines actions propriétaire

1. Déposer PDF V17 dans `docs/references/` (voir `README_V17.md`)
2. Fournir backup PG restaurable → débloque migrate / GO PROD
3. Trancher D-010 (staging Hostinger)
4. D-012 repair drift : uniquement avec phrase **`autorise repair payment drift`** + backup OK

## 11. Vague Finale (VF) — reprise 2026-07-19

| Commande | Résultat |
|----------|----------|
| `npm run typecheck` | **exit 0** |
| Tests A→F + RC Auth (53) | **exit 0** |
| `npm run audit:api-auth` | **387 routes OK** |
| `npx next build` | **exit 0** |
| Lint | NON EXÉCUTÉ (volume) |
| E2E / Hostinger | NON EXÉCUTÉ — staging isolé requis |

### Lots VF appliqués (code + docs)

| Lot | Contenu | Statut |
|-----|---------|--------|
| VF-00 | Baseline + consolidation docs | **Fait** |
| VF-P0A | Fail-closed `--accept-data-loss` (opt-in explicite) | **Fait** |
| VF-P0B | `getPosCatalogue` lecture pure + `runPosCatalogueMaintenance` | **Fait** |
| VF-QA01 | Tests comportementaux fiscal/stock/virtualisation/API | **Fait** |
| VF-P1 | Radius 7px ; profil `finance` ; docs sync/ledger | **Fait** |
| VF-P2 | Budgets perf + recette UI documentés | **Fait** (mesures p95 staging NON EXÉCUTÉ) |
| VF-P3 | Checklist / RC / validations humaines | **Fait** — **NO-GO PROD** inchangé |

**Verdict inchangé :** GO local · GO STAGING conditionnel · **NO-GO PRODUCTION** (backup PG manquant).
