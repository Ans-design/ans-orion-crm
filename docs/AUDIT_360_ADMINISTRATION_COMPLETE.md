# AUDIT 360 — Phase 13 : Administration complète

Date : 2026-07-04

---

## Modules admin existants

Administration sidebar : vue-ensemble, modeles-articles, prix, variables, matieres, sync, flux-statuts, permissions, import-export, sante, annexes

Paramètres : apparence, configuration, donnees, matieres, notifications, regles, securite

---

## Manques vs ERP admin complet

| Domaine | Présent | Manque | Priorité |
|---------|---------|--------|----------|
| Documents / contrats | FileAsset | Gestion contrats RH/clients | P2 |
| Dépenses | FinanceCharge | Workflow validation | P2 |
| Signatures | — | DocuSign-like | P3 |
| Calendrier réunions | — | Intégration calendrier | P3 |
| Coffre mots de passe | — | Policy only | P3 |
| Fournisseurs | ✅ | Contrats cadre | P2 |
| Audit complet | AuditLog | UI recherche avancée | P2 |

---

## Workflows admin recommandés

1. Nouvel employé → fiche RH → contrat → accès ORION
2. Nouveau fournisseur → validation → catalogue achats
3. Charge fixe → validation finance → export comptable
4. Modif prix → brouillon → publication → sync POS

---

## Priorités

**P1 :** Audit log UI, permissions claires  
**P2 :** Dépenses, documents RH  
**P3 :** Signatures, calendrier
