# AUDIT 360 — Phase 11 : RH / Conformité Madagascar

Date : 2026-07-04

> **Disclaimer :** Ce document n’est pas un avis juridique. Points à valider avec expert RH/fiscal local (CNaPS, DGI, inspecteur du travail).

---

## Fonctionnalités RH existantes

| Module | Route | Statut |
|--------|-------|--------|
| Employés | `/rh/employes` | ✅ |
| Présences | API `/api/rh/presences` | ✅ |
| Absences | `/rh/absences` | ✅ |
| Déclaration retard | Gate login + API late-arrival | ⚠️ |
| Paie | `/rh/paie` | ⚠️ partiel |
| Annonces | `/rh/annonces` | ✅ |
| Recrutement | `/rh/recrutement` | ✅ |
| Performance | `/rh/performance` | ✅ |
| Mon profil | `/rh/mon-profil` | ✅ |
| Équipements | `/rh/equipements` | ✅ |

Modèles : Employee, EmployeePresence, EmployeeAbsence, Payslip, EmployeeAdvance, EmployeeEvaluation

---

## Points conformité à valider (expert local)

| Sujet | Statut app | Action |
|-------|------------|--------|
| Code du travail (Loi 2003-044) | Non modélisé | Checklist legal |
| CNaPS cotisations | Champs partiels | Valider taux/formules |
| IRSA retenue salaire | Payslip structure | Valider barème |
| Registre employeur | Non export dédié | Export PDF/CSV P2 |
| Contrats travail | Fichiers génériques | Modèles doc P2 |
| Heures sup / retards | Présences + gate | Workflow validation |
| Congés payés | Absences types | Enrichir types |

---

## Risques

| Risque | Priorité |
|--------|----------|
| Paie calculée sans validation expert | P1 |
| Données sensibles salaires — RBAC | P0 |
| Gate retard fail-open serveur | P1 |

---

## Workflow recommandé

1. Présence pointée → validation manager
2. Retard déclaré → enregistrement + notification RH
3. Fin de mois → génération brouillon paie → validation → export
4. Archivage bulletins sécurisé

---

## Priorités

**P0 :** RBAC paie/salaires  
**P1 :** Validation expert IRSA/CNaPS, gate retard serveur  
**P2 :** Exports registre, modèles contrats  
**P3 :** Portail employé self-service complet
