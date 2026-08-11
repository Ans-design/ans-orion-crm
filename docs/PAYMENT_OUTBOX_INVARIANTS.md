# Paiements, ledger & outbox — invariants transactionnels

## Architecture

```text
Création paiement (idempotencyKey unique)
  └─ TRANSACTION {
       insert Paiement (statut=Valide)
       afterPaiementRecorded → recalcule Commande.acompte/reste depuis ledger
       enqueue OutboxEvent (même TX)
     }
```

`Commande.acompte` / `reste` = **projections**. Source de vérité = lignes `Paiement` ledger-admissibles.

## Statuts paiement (`PaiementStatut`)

| Statut | Compte dans acompte ? |
|--------|------------------------|
| Initie | Non |
| En_attente | Non |
| Valide | Oui |
| Rejete | Non |
| Annule | Non (historique conservé) |
| Rembourse_partiel | Oui (si type Remboursement → soustrait) |
| Rembourse_total | Non (neutralisation via flux dédié) |

Règles : `lib/finance/paiement-ledger.ts` + `computePaidTotal`.

## Invariants

1. `acompte = Σ paiements Valide (hors remb.) − Σ remboursements Valide`
2. `reste = max(0, total − acompte)`
3. Retry réseau même `idempotencyKey` → même ligne (contrainte `@unique`)
4. Annulation → `statut=Annule`, pas de DELETE
5. Montants négatifs refusés dans le ledger (`computeLedgerPaidTotal`)
6. Pas d’écriture directe `acompte` (API commande refuse ; import crée un paiement)

## Idempotence

`paymentIdempotencyKey(provider, scope, reference, montant)` + colonne unique.  
Race create → catch P2002 / findUnique replay.

## Outbox

| API | DB |
|-----|-----|
| PENDING | pending |
| PROCESSING | processing |
| DONE | succeeded |
| FAILED | failed |
| DEAD | dead |

- Claim SQLite : `updateMany` optimiste + reprise lease expiré
- Claim Postgres : `FOR UPDATE SKIP LOCKED` (repli SQLite si raw indisponible)
- Lease défaut : 60s ; backoff exponentiel ; `replayOutboxDead`
- Diagnostics : `lib/server/outbox-diagnostics.ts` — HEALTHY / DEGRADED / FAILED / UNKNOWN / NOT_CHECKED

## Limites SQLite

Les tests concurrents locaux prouvent idempotence et claim optimiste.  
Ils **ne prouvent pas** à eux seuls le comportement multi-worker Postgres SKIP LOCKED.

## Commandes

```bash
npx prisma db push
npx prisma generate
npx vitest run tests/remediation-payment-outbox-concurrency.test.ts
# Flaky check
npx vitest run tests/remediation-payment-outbox-concurrency.test.ts --repeat 3
npm run typecheck && npm run lint && npm run smoke:finance && npm run build
```

## Risques résiduels

- E2E multi-instance Postgres non exécuté ici
- ANO-OUTBOX / ANO-DIAG : PARTIALLY_FIXED jusqu’à preuve observable staging
- UI sync : mapper `healthLevel` partout (bundle diagnostics enrichi)
