# V12 — Baseline synchronisation globale

Date : 2026-08-02  
Commande inventaire : `node scripts/v12-crud-sync-inventory.mjs` → exit 0  
Artefact : `artifacts/remediation-v12/crud-sync-coverage.json`

## Métriques recalculées (dépôt courant)

| Indicateur | Valeur | Statut |
|------------|--------|--------|
| Fichiers route API | 398 | PASS |
| Routes mutantes (POST/PUT/PATCH/DELETE) | 222 | PASS |
| Mutantes avec `$transaction` (scan route) | 2 | FAIL (couverture faible — beaucoup de TX dans services) |
| Mutantes avec hint outbox (scan route) | 0 | FAIL (outbox via services, peu câblé) |
| Mutantes avec hint audit | 60 | PARTIAL |
| Mutantes avec hint idempotency | 1 | FAIL |
| Hard-delete hint | 10 | WARN |
| Modèles Prisma | 156 | PASS |
| `OutboxEvent` | présent (minimal V10) | PARTIAL |
| `SyncRun` / `SyncRunStep` | absents | FAIL |

## Preuves V10 pertinentes

- Suite Vitest globale : 2098 PASS / 0 FAIL (session antérieure) — à rejouer après lots V12.
- `Paiement.idempotencyKey` unique : présent.
- `enqueueOutbox` + usage BAT→GPAO : présent, sans worker consommateur.

## Écarts structurels P0 (confirmés)

1. `admin-to-commercial-sync.syncAll` retourne `ok: true` même après catches d’étapes.
2. `notifyAdminModuleMutation` = invalidation cache + audit, pas propagation métier.
3. Pas de SyncRun durable ni worker outbox.
4. Outbox sans `idempotencyKey` UNIQUE / lease / DEAD.
5. Sources prix encore multiples (release immuable absente).

## Limites

- Scan AST route ≠ couverture service complète (TX/outbox dans `lib/services`).
- E2E mutables : NOT_RUN (base isolée requise).
- Secrets / PII : non inclus dans ce rapport.

## Prochaine étape

Lot 1 — enrichir OutboxEvent, SyncRun/Step, worker, enveloppe mutation ; corriger `syncAll`.
