# Audit bugs, anomalies & étapes oubliées

| Date | 2026-07-18 |
|------|------------|
| Verdict | **GO STAGING (doc)** · **NO-GO PRODUCTION** |
| Canvas | `canvases/audit-bugs-etapes-oubliees.canvas.tsx` (IDE) |

## 1. Bugs code actifs (enveloppe `{ ok, data }`)

| ID | Sévérité | Fichier | API | Effet |
|----|----------|---------|-----|-------|
| B-01 | P0 | `lib/hooks/use-ans-talk.tsx` | `POST /api/messaging/upload` | **CORRIGÉ** — `unwrapApiData` |
| B-02 | P0 | `commande-integration-hub.tsx` | `create-from-order` | **CORRIGÉ** — `unwrapApiData` |
| B-03 | P1 | `orion-drawer-provider.tsx` | `GET /api/stock/[id]` | **CORRIGÉ** — unwrap drawer |
| B-04 | P1 | `workspace/commercial/page.tsx` | `GET /api/reports` | **CORRIGÉ** — unwrap KPIs |
| B-05 | P1 | `pos-paiement-modal.tsx` | `POST /api/paiements/batch` | **CORRIGÉ** — receiptNum |
| B-06 | P1 | production / paiements / factures / livraisons / planning / Talk / commandes / qualité | `GET /api/commandes` | **CORRIGÉ** — `unwrapListItems` / `unwrapPaginated` + `limit` → pagination |
| B-07 | P2 | MaterialFromStockModal, achats, stock anomalies/mouvements | stock | **CORRIGÉ** — `unwrapListItems` |
| B-08 | P1 | devis, commandes hub, clients, backoffice prix/formules, sync POS | enveloppe `{ error: { message } }` | **CORRIGÉ** — `getApiErrorMessage` + `unwrapPaginated` devis + clés listes fallback |
| B-09 | P1 | paiements / factures / achats / planning | double-clic écritures + slots | **CORRIGÉ** — `saving`/`receivingId` + claim `En réception` + unwrap slots |
| B-10 | P1 | achats/planning/fournisseurs create ; kanban/workflow ; sync/merge/qualité | double-create + toasts objet | **CORRIGÉ** — gardes `saving` + `getApiErrorMessage` hub commande |

**Corrigé récemment :** CRM Clients fichiers · B-01…B-10 · upload livreur/preuve/BAT · charges · réclamations · toasts `[object Object]`.

## 2. Anomalies métier / données

| ID | Sévérité | Anomalie | Statut |
|----|----------|----------|--------|
| M-01 | P0 | Production terminée → consommation stock | **CORRIGÉ D-011** — `consumeReservationsForCommande` |
| M-02 | P0 | Payment drift **VÉRIFIÉ RO** : `CMD-2024-013` acompte DB 630000 vs réel 180000 — repair **BLOQUÉ** (voir `DIAGNOSTIC_PAYMENT_DRIFT_RO.md`) | Bloqué D-012 |
| M-03 | P1 | Release Annulée + consommation Prête / Livré | **CORRIGÉ D-011** |
| M-04 | P1 | Overpay update, verrou Emise, snapshot auto-facture | **CORRIGÉ V2-06b** |

## 3. Bloquants déploiement

| ID | Sévérité | Sujet |
|----|----------|-------|
| D-01 | P0 | Backup PG restaurable **manquant** |
| D-02 | P0 | Drift Prisma sqlite source / postgres prod |
| D-03 | P0 | Formules custom perdues sans backup |
| D-04 | P1 | PDF V17 absents → C01–C06 non validables |

## 3b. Vague Finale — Top risques (2026-07-19)

| ID | Sévérité | Anomalie | Statut |
|----|----------|----------|--------|
| VF-01 | P0 | Backup PG manquant | Ouvert — humain |
| VF-02 | P0 | Payment drift CMD-2024-013 | Ouvert — D-012 |
| VF-03 | P0 | Drift sqlite/postgres | Mitigé patch build |
| VF-04 | P0 | `db push --accept-data-loss` build | **CORRIGÉ VF-P0A** (opt-in) |
| VF-05 | P0 | Mutations au read POS catalogue | **CORRIGÉ VF-P0B** |
| VF-06 | P1 | Preuves A→F trop syntaxiques | **CORRIGÉ partiel VF-QA01** |
| VF-07 | P1 | Nav `finance` absente du profil | **CORRIGÉ VF-P1** |
| VF-08 | P1 | Radius 10px vs règle 7px | **CORRIGÉ VF-P1** |
| VF-09 | P1 | build:hostinger / E2E staging | Ouvert |
| VF-10 | P1 | Secrets deploy/hostinger | Vérif humaine |
| VF-11 | P1 | Sync Admin→POS E2E | Ouvert (base isolée) |
| VF-12 | P2 | Budgets perf p95 | Stub documenté |

## 4. Étapes oubliées / non exécutées

### P0

1. Fournir + tester restore dump PostgreSQL
2. Maintenir D-011 : consommation stock centralisée sans double débit
3. Maintenir blocage migrate/deploy prod sans backup

### P1

1. Déposer PDF V17 dans `docs/references/`
2. `npm run build:hostinger` + healthchecks
3. Exécuter les cases staging restantes de `CHECKLIST_VALIDATION_MANUELLE_RC.md` (Auth/RBAC déjà automatisé)
4. E2E sync Admin → Commercial → POS (DB isolée)
5. Décisions **D-006…D-010**
6. Traiter payment drift (outil backoffice **après** backup)
7. Validation juridique C01–C06 avant code RH/HSE

### P2

1. Lint + budgets perf (`npx next build` local déjà OK)
2. Recette UI 320–1440
3. Lots roadmap : variables DB, virtualisation, 2FA/CSP
4. Empreinte Git (actuellement absente)

## 5. Ordre recommandé

```text
Backup PG + PDF V17 (propriétaire)
  → B-01…B-07 + D-011 + V2-06b fermés
  → Repair payment drift (staging, autorisation D-012)
  → build:hostinger + checklist RC
  → Staging Hostinger seulement
  → PROD interdit sans backup + GO explicite
```

## Références

- `docs/audit/RAPPORT_RELEASE_CANDIDATE.md`
- `docs/audit/VAGUE_2_ETAT_REPRISE.md`
- `docs/audit/DECISIONS_EN_ATTENTE.md`
- `docs/audit/CHECKLIST_VALIDATION_MANUELLE_RC.md`
- `docs/audit/REGISTRE_INVARIANTS_STOCK_PRODUCTION.md`
