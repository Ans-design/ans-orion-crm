# Matrice statuts & transitions ANS — V2-02R

| Date | 2026-07-18 |
|------|------------|
| Source code | `commande-workflow.ts`, `status-registry.ts`, devis/facture bridges |

## Commande (FSM serveur — référence)

| From → To autorisés | Gates |
|---------------------|-------|
| À planifier → En attente stock, En production, Suspendu, Annulée | stock / acompte / BAT pour production |
| En attente stock → À planifier, En production, Suspendu, Annulée | |
| En production → En finition, En attente stock, Suspendu, Annulée | |
| En finition → Prête, En production, Suspendu, Annulée | CQ pour Prête |
| Prête → Livré, En finition, Suspendu, Annulée | reste=0 pour Livré |
| Suspendu → À planifier, En production, En attente stock, Annulée | |
| Livré / Annulée | terminaux |

**Effets stock (D-011) :** Annulée libère les réservations ; Prête / Livré les consomme de façon idempotente.

## Devis

| Transition | Serveur |
|------------|---------|
| → Accepté | **Uniquement** `acceptDevisToCommande` (PUT bloqué V2-06) |
| → Expiré | cron |
| Suppressions | bloquées si Accepté |

## Facture

| Règle | Serveur |
|-------|---------|
| Lignes | modifiables seulement Brouillon |
| Payée | via encaissements |
| Emise / Partiellement payée | notes, échéance, lignes, remise et TVA verrouillées (V2-06b) |

## Paiement / Caisse

| Règle | Serveur |
|-------|---------|
| Overpay | refusé ±1 Ar à la création et à la modification (paiement courant exclu du calcul) |
| Même référence | replay idempotent |
| Session | une open / user ; close avec totals sessionId |

## Exceptions métier V17 (cible)

| Exception | Transition / action | État |
|-----------|---------------------|------|
| Fichier non conforme | Bloque prod + motif BAT | planifié |
| BAT refusé | retour studio | présent partiel |
| Rupture stock | En attente stock | présent |
| Machine panne | Suspendu / ticket | partiel |
| CQ refusé | reste En finition | partiel |
| Livraison échouée | statut livraison | partiel |
| Annulation | Annulée + release stock | **corrigé** |
| Remboursement | type Remboursement | présent |

## Jalons workflow (8) vs V17

creee → validation_client → bat_envoye → bat_approuve → en_impression → faconnage → pret_a_livrer → livree  
(`COMMANDE_WORKFLOW_JALONS`)
