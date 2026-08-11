# AUDIT 360 — Phase 15 : Finance / Fiscalité Madagascar

Date : 2026-07-04

> **Disclaimer :** Points à valider avec comptable/fiscaliste. Ne pas inventer de règles fiscales.

---

## Modules finance existants

| Module | Route / API |
|--------|-------------|
| Factures | `/factures`, `/api/factures` |
| Paiements | `/paiements`, `/api/paiements` |
| Caisse | `/caisse` |
| Charges | `/finance/charges` |
| Fiscalité | `/finance/fiscalite` |
| Coûts revient | `/finance/couts-revient` |
| Ventes directes | `/finance/ventes-directes` |
| Dashboard finance | `/api/dashboard/finance` |

Modèles : Facture, Paiement, CashSession, FinanceCharge, FiscalObligation

---

## État récent (lot paiement commande)

- Paiement niveau commande même si facture existe ✅
- Resync statuts factures liées ✅
- Statuts UI : Non payé / Acompte / Partiel / Soldé ✅
- Métadonnées paiement (Mobile Money, banque, référence) ✅

---

## Points à valider expert

| Sujet | Statut app |
|-------|------------|
| Numérotation facture légale | Séquences PAY/FAC |
| TVA / exonérations | Variable globale — valider taux |
| IRSA (paie) | Payslip — valider |
| e-Hetra / e-Déclaration | Non intégré P3 |
| Export comptable | Export API partiel P1 |
| Reçus / proformas | PDF facture ✅ |
| Acomptes vs solde | Type paiement Acompte/Solde ✅ |

---

## Risques

| Risque | Priorité |
|--------|----------|
| Double comptabilisation paiement facture + commande | P1 — mitigé sync |
| Facture sans mention légale | P2 |
| Pas export expert-comptable standard | P1 |

---

## Priorités

**P0 :** Montants exacts, traçabilité paiements  
**P1 :** Export comptable, validation mentions facture  
**P2 :** FiscalObligation workflow  
**P3 :** Intégration e-Déclaration
