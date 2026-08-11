# V12 — Lot 3 notes (Devis / Stock)

## Devis → Commande

- `acceptDevisToCommande` écrit `OutboxEvent` type `DevisAccepted` **dans la même TX** que claim devis + create commande + réservations stock.
- IdempotencyKey : `devis-accepted:{devisId}:{commandeId}`.
- Handler cron : ack / reconcile (bootstrap workflow reste synchrone pour UX).

## Stock

- Réservations via `reserveStockForDevisAccept` dans la TX d’acceptation.
- Ledger `StockMovement` existant — généralisation outbox + `idempotencyKey` mouvement : **NOT_RUN / PARTIAL**.

## Statut

| Item | Statut |
|------|--------|
| DevisAccepted outbox in-TX | PASS |
| Handler enregistré | PASS |
| StockMovement idempotence DB généralisée | NOT_RUN |
| E2E double-accept race | NOT_RUN |
