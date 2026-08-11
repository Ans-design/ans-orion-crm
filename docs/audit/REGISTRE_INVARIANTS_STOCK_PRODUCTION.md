# Registre invariants stock / production — Vague 2 (V2-05)

| Date | 2026-07-18 |
|------|------------|
| Statut | Correctifs P0/P1 appliqués ; réconciliation réelle toujours manuelle |

## Types de mouvements

| Type | Writer | Idempotence | Statut V2 |
|------|--------|-------------|-----------|
| entree / sortie / ajustement | `adjustStock` (TX interactive) | référence | **OK** |
| reservation | `reserveStock` | article×commande | **OK** |
| vente_directe | `createStockDirectSale` | `VD-{saleId}` | **Corrigé** (refuse oversell / réservé) |
| production | `consumeStockReservation` / fin production | `PROD-CONSUME-{reservationId}` | **OK (D-011)** |
| annulation_reservation | `releaseStockReservation` / Annulée | référence | **OK** |
| livraison | — | — | Pas de débit stock |

## Correctifs appliqués

1. `adjustStock` : lecture + idempotence + écriture dans **une** `$transaction` interactive  
2. Vente directe : `assertDebitAllowed` (pas de `Math.max(0,…)` silencieux)  
3. Helpers purs : `assertDebitAllowed`, `simulateConcurrentDebits`, `computeReservedAfterRelease`
4. Réception achat : mouvement, coût fournisseur, quantité reçue et statut dans **une transaction**
5. `adjustStock(params, tx)` réutilise la transaction appelante ; sync Matières après commit

## Gaps restants (pas de mutation métier auto)

| Gap | Gravité | Décision |
|-----|---------|----------|
| Production terminée ≠ sortie stock | P0 | **Corrigé D-011** — `consumeReservationsForCommande` dans `syncCommandeAfterProductionComplete` |
| Release réservation | P0 | **Corrigé** sur Annulée |
| Réception achat hors TX globale | P1 | **Corrigé V2-05b** — `adjustStock(tx)` + transaction commande entière |
| Double réception concurrente | P1 | **Corrigé B-09** — claim statut `En réception` + UI `receivingId` |

## Réconciliation lecture seule

Ne pas corriger automatiquement les écarts stock réels. Rapport futur : article | stock | somme mvt | réservé | écart.

Tests : `tests/lot4-stock-idempotence.test.ts`, `tests/v2-stock-finance-invariants.test.ts`, `tests/v2-purchase-receipt-atomic.test.ts`
