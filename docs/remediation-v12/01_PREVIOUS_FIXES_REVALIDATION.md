# V12 — Revalidation correctifs V4–V11

| Version | Affirmation | Fichier actuel | Test actuel | Statut | Écart | Correction V12 |
|---------|-------------|----------------|-------------|--------|-------|----------------|
| V10 | Outbox durable BAT/GPAO | `lib/server/outbox.ts`, `OutboxEvent` | — | PARTIAL | Pas de worker, schéma minimal | Lot 1 |
| V10 | Paiement idempotent | `Paiement.idempotencyKey` | `tests/v10-prix-paiement.test.ts` | PASS | — | Conserver |
| V10 | Prix Excel ≠ runtime | `pos-catalog-entry-price.ts` | catalogue-pos-builder | PASS partiel | Pas de PricingRelease | Lot 2 |
| V10 | Auth fail-closed | `auth-utils`, `auth-secret` | lot2-auth-security | PASS | C005 rotation externe BLOCKED | Hors V12 |
| V10 | Suite Vitest verte | — | 2098 PASS | PASS (à rejouer) | — | Lot 9 |
| V6 | Snapshots prix devis | services devis | — | PARTIAL | Multi-sources | Lot 2+4 |
| V7 | Réception achat atomique | purchase receipt | v2-purchase-receipt | PARTIAL | Remontée matière sans outbox | Lot 3 |
| V8 | Livraison→commande | livraison services | — | PARTIAL | Rollback manuel incomplet | Lot 6 |
| V11 | Design unifié | docs/design-v11 | — | NOT_RUN | Design après socle sync | Après Lot 1 |
| V4–V9 | Divers « FIXED » | — | — | BLOCKED | Preuves E2E absentes | Lots 4–9 |

Statuts : PASS / FAIL / BLOCKED / NOT_RUN / PARTIAL (PARTIAL = non certifiable 10/10).
