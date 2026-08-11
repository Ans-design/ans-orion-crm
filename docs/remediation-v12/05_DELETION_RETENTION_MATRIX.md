# V12 — Matrice archivage / rétention / suppression

Règle générale : Delete UI = archive/tombstone. Purge physique = job séparé, dry-run, super-admin.

Helper : [`lib/server/soft-archive.ts`](../../lib/server/soft-archive.ts) — `assertSoftDeleteAllowed`.

| Entité | Archive | Restore | Bloquants | Purge physique | Snapshot | Événement |
|--------|---------|---------|-----------|----------------|----------|-----------|
| BaseMaterial | oui | oui → draft | stock/prix liés | si aucune ref + rétention | oui | MaterialArchived |
| ArticlePricingProfile | oui | oui | devis historiques | non immédiat | oui | PricingDraftChanged |
| StockItem | oui | oui | mouvements | interdit si ledger | ledger | StockItemArchived |
| Client | oui | oui | commandes | anonymisation | oui | ClientArchived |
| Commande | non delete | — | factures/paiements | interdit | snapshots | — |
| Facture / Paiement | non | — | ledger | interdit | oui | — |
| StockMovement | non | — | ledger | interdit | — | — |
| Proof / BAT | versionné | — | commande | interdit | versions | ProofStatusChanged |
| ProductionDossier | archive | — | commande | interdit | étapes | — |
| Conversation Talk | archive | — | liens métier | soft | — | — |
| User | désactiver | réactiver | sessions | anonymiser | audit | PermissionPolicyChanged |
| PricingRelease | archive only | rollback = new version | POS actif | interdit | hash | PricingReleasePublished |

## Guards

`HARD_DELETE_BLOCKED` : Commande, Facture, Paiement, StockMovement, Proof, ProductionDossier.

Statut Lot 8 : **PASS documentaire + helper** ; branchement exhaustif de toutes les routes DELETE = PARTIAL.
