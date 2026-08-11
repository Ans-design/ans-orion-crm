# Registre invariants financiers — Vague 2 (V2-06)

| Date | 2026-07-18 (V2-06b) |
|------|---------------------|
| Statut | Gaps P1 finance lot fermés ; FSM facture encore partielle (transitions) |

## Machines à états

| Entité | FSM serveur | Notes |
|--------|-------------|-------|
| Commande | **Oui** `commande-workflow.ts` | Référence |
| Devis | Partiel | Accepté **interdit** via PUT (corrigé) |
| Facture | Partiel | Lignes lockées hors Brouillon ; **Emise / Partiellement_payée** : notes, échéance, lignes, remise, TVA verrouillés |
| Paiement | Types seulement | Idempotence **référence** ; overpay create **et** update |
| Caisse | open/closed | Totals scopés `sessionId` (corrigé) |

## Correctifs appliqués

| Fix | Fichier |
|-----|---------|
| PUT devis ≠ Accepté | `devis.service.ts` + route 409 |
| Arrondi MGA create/update facture | `factures.service.ts` |
| Paiement même `reference` → replay | `paiements.service.ts` |
| Caisse : filtre `notes.sessionId` | `cash-session.ts` + close route |
| `updatePaiementRecord` overpay (exclure id courant) | `paiements.service.ts` |
| `ensureFactureForCommande` + `assertCommandeBillable` | `facture-workflow-service.ts` |
| Verrou meta Emise / Partiellement_payée | `factures.service.ts` |
| UI garde reste commande + unwrap listes | `paiements/page.tsx`, production, livraisons |

## Invariants

- **Ledger `Paiement` = source officielle** des encaissements ; `Commande.acompte` / `Commande.reste` sont des **totaux dérivés** (réconciliation Centre sync)
- paid + reste ≈ total (±1 Ar) — existant
- lignes verrouillées après Brouillon — existant
- snapshot commande requis pour facturer — `assertCommandeBillable` (create API **et** ensure workflow)
- double paiement référence Mobile Money — **bloqué**
- update montant paiement ne peut pas dépasser reste (self exclu)
- Drift connu `CMD-2024-013` : repair **bloqué** jusqu’à backup + phrase D-012

## Gaps restants

| Gap | Gravité |
|-----|---------|
| FSM transitions facture exhaustive (tous statuts) | P2 |
| Drift paiement `CMD-2024-013` (repair bloqué D-012) | P1 données |
| Consommation stock fin prod | **Fermé** (D-011) |

Tests : `tests/v2-stock-finance-invariants.test.ts`, `tests/v2-finance-overpay-facture-lock.test.ts`, `tests/facture-workflow-payment.test.ts`
