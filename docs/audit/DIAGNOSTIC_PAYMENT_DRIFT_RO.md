# Payment drift — diagnostic lecture seule

| Date | 2026-07-18 |
|------|------------|
| Méthode | `detectPaymentDrift(150)` — **aucune** écriture / pas de `repairPaymentDrift` |
| Résultat | `mismatchCount: 1` |

## Échantillon

| Commande | Constat |
|----------|---------|
| `CMD-2024-013` | DB acompte **630000** vs ledger réel **180000** |

## Interprétation

Les champs `acompte` / `reste` sur la commande ne reflètent pas la somme des paiements du ledger. L’alerte ticker « Sync : acompte/reste DB ≠ encaissé » est donc **fondée**.

## Action proposée (validation requise)

1. Ouvrir `/commandes` → fiche `CMD-2024-013` et comparer paiements.
2. Si le ledger est la vérité : lancer **dry-run** puis `repairPaymentDrift` via Centre sync / `POST /api/admin-backoffice/repair-payment-drift` **uniquement après backup**.
3. Ne pas corriger à la main les totaux sans audit.

Statut : **BLOQUÉ — VALIDATION REQUISE** pour le repair.
