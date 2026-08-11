# Matrice de synchronisation des données

| Date | 2026-07-18 |
|------|------------|
| Statut | Pointeur vers source existante + écarts observés |

## Source officielle documentée

Le détail opérationnel est maintenu dans **[`docs/SYNC_MATRIX.md`](../SYNC_MATRIX.md)** (Backoffice → POS / Stock / Devis, etc.).

## Écarts observés (audit 2026-07-18)

| Donnée | Source cible | État réel local | Risque |
|--------|--------------|-----------------|--------|
| Prix / formules | Profils publiés + FormulaVersion | Restauré via catalogue (98 formules) | Custom admin perdu si non seedé |
| PRIX 2026 | Archive | 1140 lignes seed Excel | Ne doit plus être source POS |
| Stock | StockItem + mouvements | Présent (seed) | **Lot 4 fait** — idempotence référence / réservation commande |
| Permissions menus | role-registry | Actif | Vérifier API serveur Lot 2 |

## Conflits à tester (Lot 5)

Voir mega-prompt §9 : double vente dernier stock, prix change pendant devis, double paiement, publication partielle Admin/POS.
