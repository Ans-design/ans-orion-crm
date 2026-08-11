# V12 — Catalogue d’événements (minimal)

Version payloads : `v1`. Pas de salaires, marges, PII inutiles, binaires.

## Administration

- AdminConfigDraftSaved
- AdminConfigPublished
- AdminConfigRolledBackAsNewRelease
- PermissionPolicyChanged

## Prix / matières

- MaterialCreated / Updated / Archived / Restored
- MaterialStockLinked / Unlinked
- PricingDraftChanged
- PricingReleasePublished / Archived

## Stock / achats

- StockItemCreated / Adjusted / Reserved / Released / Consumed
- PurchaseReceiptPosted
- InventorySessionApplied

## Commercial / BAT / Prod

- DevisAccepted
- CommandeStatusChanged
- ProofStatusChanged
- GpaoStepChanged
- ProductionStepCompleted

## Logistique / finance

- DeliveryCompleted
- InvoiceIssued
- PaymentRecorded

## Communication

- BusinessConversationEnsured
- BusinessNotificationRequested

Handlers enregistrés via `registerOutboxHandler(type, fn)` dans `lib/server/outbox-worker.ts`.
Worker : `POST /api/cron/outbox` + `CRON_SECRET`.
