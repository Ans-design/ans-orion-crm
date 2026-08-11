# V12 — Lot 6 Logistique / Finance

## Livré

- `Paiement` : `idempotencyKey` + outbox `PaiementRecorded` **dans la TX** create.
- `SequenceService` : upsert atomique (déjà DATA-005).
- Livraison `Livré` : outbox `LivraisonCompleted` après transition + ensureFacture (best-effort ; TX unifiée livraison+commande = PARTIAL).

## Statut

| Item | Statut |
|------|--------|
| Paiement idempotent + outbox | PASS |
| Séquences atomiques | PASS |
| LivraisonCompleted event | PASS partiel |
| Saga livraison+facture même TX | NOT_RUN |
| E2E paiement double | NOT_RUN |
