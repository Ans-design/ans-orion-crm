# Matrice contrats intermodules — Vague 2

| Producteur | Événement | Données | Consommateur | Invariant | Idempotence | Permission | Test |
|------------|-----------|---------|--------------|-----------|-------------|------------|------|
| Admin publish | Publication | profils/formules | POS / Commercial | published only | publish TX | config:publish | doc V2-04 |
| Admin sync | Sync catalogue | ArticlePricingProfile | POS | même ref/prix | sync service | config:publish | consolidation |
| POS panier | calculatePrice | snapshot ligne | Devis | pas de recalcul silencieux | — | pos:use | V2-03 |
| Devis accept | acceptDevisToCommande | commande+lignes | GPAO/stock | Accepté une fois | ALREADY_ACCEPTED | devis:accept | code |
| Devis PUT | statut | — | — | **Accepté interdit** | — | devis:write | V2-06 |
| Réservation | reserveStock | reservedQty | Stock | dispo ≥ qty | article×cmd | — | Lot4 |
| Vente directe | createStockDirectSale | sortie | Stock | refuse oversell | VD-id | finance | V2-05 |
| Paiement | createPaiement | montant | Facture/caisse | paid+reste≈total | reference | paiements:write | V2-06 |
| Caisse close | computeSessionTotals | modes | Session | sessionId | open unique | pos:close_register | V2-06 |
| Facture | create from cmd | lignes | Finance | snapshot billable | — | factures:write | guard |
| Production done | sync statut + **consommation** | — | Stock | `consumeReservationsForCommande` (Prête/Livré) | `PROD-CONSUME-*` | D-011 | **OK** |
| Role | hasPermission | menus+API | UI | serveur = vérité | — | middleware+/api | Lot2 |

## Écarts ouverts

- Production → consommation stock : **branché** (Prête / Livré + jalons, D-011)  
- Release réservation : **branché** (Annulée)  
- Backup PG : **MANQUANT** → bloque GO PRODUCTION  
- Payment drift `CMD-2024-013` : détecté — repair **BLOQUÉ** (D-012)  
