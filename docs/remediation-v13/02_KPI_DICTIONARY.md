# V13 — Dictionnaire KPI (extrait exécutable)

Registre code : [`lib/kpi/registry.ts`](../../lib/kpi/registry.ts) + `lib/kpi/definitions/*`.

## Conversion devis — COM-007 v1 (approuvée V13)

- **Numérateur** : devis `Accepté`
- **Dénominateur** : tous hors `Brouillon` (Envoyé + Accepté + Refusé + Expiré)
- **Unité** : PERCENT
- Legacy dashboard excluait les refusés du dénominateur → documenté dans `04_LEGACY_PARITY.md`

## Finance BLOCKED

| ID | Label | Raison |
|----|-------|--------|
| DIR-006 | Marge brute | Couverture coûts incomplète — arbitrage Finance |
| DIR-007 | Résultat opérationnel | Interdit d’appeler « net » CA−charges |

Affichage honnête runtime : `caMoinsChargesMois`, `margeApproximativeChargesPct`.

## Autres IDs actifs (échantillon)

DIR-001, DIR-002, DIR-008, COM-003…007, PRO-004/005, STK-003/004, MAC-006/012, FIN-004/006, CM-006, ADM-008, LOG-FIN-COUNT, RH-002, STU-005.
