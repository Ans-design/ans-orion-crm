# AUDIT 360 — Phase 16 : Matrice de synchronisation globale

Date : 2026-07-04  
Complète : `docs/SYNC_MATRIX.md`, `lib/services/sync-drift-service.ts`

---

## Légende statut

| Statut | Signification |
|--------|---------------|
| ✅ Sync OK | Implémenté et testé |
| ⚠️ Partiel | Fonctionne avec risques |
| ❌ Gap | Non implémenté |
| 🔄 En cours | Lot récent à valider |

---

## Flux commercial

| Source | Destination | Donnée | API / Service | Risque | Statut | Action |
|--------|-------------|--------|---------------|--------|--------|--------|
| Backoffice prix | POS | grilles, options, impact prix | `sync-dynamic-pricing`, `/api/pos/catalogue` | Prix faux | ⚠️ | Valider drift centre sync |
| Backoffice prix | Devis | formules, paliers | dynamic-pricing | Devis faux | ✅ | — |
| POS | Panier | config + prix | cart-service | Perte config | ✅ | — |
| Panier | Devis | lignes snapshot | devis API | — | ✅ | — |
| Devis accepté | Commande | lignes, client, logistics | devis-accept-service | — | ✅ | — |
| Paiement devis | Commande auto | acompte | devis-acompte-service | — | ⚠️ | Tester edge cases |
| Paiement commande | Facture(s) | statut payé | `syncCommandeLinkedFacturesFromPayments` | Drift finance | 🔄 | Valider manuellement |
| Commande | Facture | lignes TTC | `/api/commandes/[id]/facture` | — | ✅ | — |
| Facture | Paiement | montant | paiements.service | — | ✅ | — |

---

## Flux production & stock

| Source | Destination | Donnée | Risque | Statut | Action |
|--------|-------------|--------|--------|--------|--------|
| Commande confirmée | GPAO dossier | qté, délais | Prod non lancée | ⚠️ | Renforcer auto-create |
| BAT validé | Production | déblocage | Prod sans BAT | ✅ | Blocages |
| Commande | Stock réservation | matières | Survente | ⚠️ | Vérifier réservations |
| Production terminée | Stock conso | quantités | Stock faux | ⚠️ | Audit conso réelle |
| Production | Livraison | statut prêt | Retard | ⚠️ | Action next livraison |

---

## Flux RH & dashboard

| Source | Destination | Donnée | Statut | Action |
|--------|-------------|--------|--------|--------|
| Présences | Paie | heures | ⚠️ | Valider calcul |
| Paiements | Dashboard finance | encaissements | ✅ | — |
| Commandes | Dashboard ventes | pipeline | ✅ | — |
| Sync drift | Centre sync UI | alertes | ✅ | Monitorer |

---

## Flux ANS Talk

| Source | Destination | Donnée | Statut |
|--------|-------------|--------|--------|
| Commande | TalkConversation | groupe auto | ✅ |
| Talk | Commande 360 | attachments | ✅ |
| Client | Talk | — | ⚠️ partiel |

---

## Actions correctives prioritaires

1. **P1** — Valider paiement commande → facture resync (lot 2026-07-04)
2. **P1** — Centre sync après chaque publication prix
3. **P1** — Stock réservation ↔ production consommation
4. **P2** — RH présences → paie
5. **P2** — Livraison → facture proposée auto

---

*Matrice vivante — mettre à jour après chaque lot de correction.*
