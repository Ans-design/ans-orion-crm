# Audit gestion de données — ANS ORION

> **Date :** juillet 2026  
> **Périmètre :** 99 modèles Prisma · ~217 routes API · Backoffice · POS · GPAO  
> **Stack :** Next.js · Prisma · SQLite (local) / PostgreSQL (prod)

---

## Synthèse exécutive

| Indicateur | État |
|------------|------|
| Couverture schéma | **Forte** — CRM, ventes, finance, stock, GPAO, RH, Talk, admin |
| Refactor data layer | **Partiel** — 6 modules `lib/server/modules/` (clients, commandes, devis, paiements, factures, livraisons) |
| Routes Prisma direct | **~90 routes** — risque incohérence validation/erreurs |
| Audit trail | **Présent** — `AuditLog` + `logAudit` (~70 call sites), pas de `before`/`after` structuré partout |
| Import/export | **Dual** — `/api/import|export` (métier) + `admin-config` (backoffice) |
| Data quality | **Faible** — `ImportAnomaly` en schéma, pas de service centralisé |
| Backoffice admin | **Riche** — `pricing-v4`, 20+ sections `/administration/:section` |

---

## Légende gravité

| Niveau | Signification |
|--------|----------------|
| **P0** | Données invalides, perte, sécurité, blocage flux |
| **P1** | Incohérence module, API fragile, admin difficile |
| **P2** | Amélioration structure, perf, DX |
| **P3** | Confort admin, polish |

---

## 1. CRM Clients

| Aspect | Détail |
|--------|--------|
| **Modèles** | `Client`, `ClientReclamation`, `ClientNotificationLog` |
| **Données clés** | code, name, NIF, canaux (vente/découverte/commande), charte (adresses JSON), catégorie, statut |
| **Relations** | devis, commandes, factures, paiements, livraisons, Talk, CM |
| **APIs** | `/api/clients/*` — **migré** vers `lib/server/modules/clients/` |
| **Formulaires** | `app/(app)/clients/page.tsx`, quick-create POS |
| **Vues admin** | CRM liste + fiche 360, drawer Orion |

**Problèmes**

| ID | Gravité | Problème |
|----|---------|----------|
| C-01 | P2 | `charte` en JSON string — pas de modèle `Adresse` relationnel |
| C-02 | P2 | Doublons détectés à la création mais pas de merge auto UI partout |
| C-03 | P1 | NIF requis création complète, optionnel quick-create — cohérent métier mais à documenter |
| C-04 | P3 | `ca` / `cmds` dénormalisés sur Client — risque dérive vs agrégats réels |

---

## 2. Catalogue POS & Backoffice prix

| Aspect | Détail |
|--------|--------|
| **Modèles** | `Tarif`, `SalePrice2026`, `MaterialCatalog`, `GrammageCatalog`, `ProductOptionGroup`, `ProductOptionValue`, `PricingVariable`, `PriceFormula`, `ArticleTemplate`, `AdminConfigVersion` |
| **APIs** | `/api/admin-config/*`, `/api/tarifs`, `/api/pricing/*`, `/api/backoffice/*`, `/api/pos/*` |
| **UI** | `components/admin/pricing-v4/`, `/administration/articles|prix|variables|…` |

**Problèmes**

| ID | Gravité | Problème |
|----|---------|----------|
| P-01 | P1 | Config POS = JSON publié — pas de diff visuel draft vs prod pour tous les champs |
| P-02 | P1 | Laizes GF : fallbacks code + stock — bien corrigé récemment, à centraliser en règle data |
| P-03 | P2 | Prix / formules / variables dispersés sur plusieurs tables — courbe d'apprentissage admin |
| P-04 | P2 | Pas d'enum Prisma pour catégories article — strings libres |

---

## 3. Panier

| Aspect | Détail |
|--------|--------|
| **Modèles** | Pas de `Cart` persistant — session / state client + APIs panier |
| **APIs** | `/api/cart/*` |
| **Flux** | POS → panier → devis / commande / facture |

**Problèmes**

| ID | Gravité | Problème |
|----|---------|----------|
| CA-01 | P1 | Panier non persisté en DB — perte si session expirée |
| CA-02 | P2 | `configSnapshot` JSON sur lignes — validation Zod partielle |

---

## 4. Devis / Proformas

| Aspect | Détail |
|--------|--------|
| **Modèles** | `Devis`, `DevisLigne` |
| **Statuts** | Brouillon, Envoyé, En attente, Accepté, Refusé, Expiré |
| **APIs** | `/api/devis/*` — **migré** service/repository |
| **Snapshots** | `configSnapshot` sur lignes, pas de `logisticsSnapshot` sur Devis |

**Problèmes**

| ID | Gravité | Problème |
|----|---------|----------|
| D-01 | P2 | Versions devis via route dédiée — pas de modèle `DevisVersion` |
| D-02 | P1 | PUT `[id]` utilise encore session NextAuth directe (pas `requirePermission`) |
| D-03 | P2 | Pas de snapshot logistique figé à l'acceptation |

---

## 5. Commandes

| Aspect | Détail |
|--------|--------|
| **Modèles** | `Commande`, `CommandeLigne`, `CommandeBlocage` |
| **Statuts** | Workflow GPAO (À planifier → Livré, etc.) |
| **APIs** | `/api/commandes/*` — list + détail + PUT **migrés** ; sous-routes (workflow, overview, facture) non migrées |
| **Snapshots** | `configSnapshot` JSON sur commande et lignes |

**Problèmes**

| ID | Gravité | Problème |
|----|---------|----------|
| CO-01 | P1 | `paymentSnapshot` absent du schéma — reste calculé à la volée |
| CO-02 | P2 | Sous-routes (`overview`, `workflow`, `blocages`) encore Prisma direct |
| CO-03 | P3 | `article` string sur commande + lignes — legacy vs `CommandeLigne` |

---

## 6. Paiements & Finance

| Aspect | Détail |
|--------|--------|
| **Modèles** | `Paiement`, `Facture`, `FinanceCharge`, `FiscalObligation`, `CashSession` |
| **APIs** | `/api/paiements/*`, `/api/factures/*`, `/api/caisse/*` — **migrés** (CRUD principal) |

**Problèmes**

| ID | Gravité | Problème |
|----|---------|----------|
| F-01 | P1 | Référence Mobile Money non toujours obligatoire côté validation |
| F-02 | P2 | `Facture.lignes` en JSON — pas de `FactureLigne` relationnel |
| F-03 | P2 | PUT paiement `[id]` — session auth, pas permission granulaire |

---

## 7. Production / GPAO

| Aspect | Détail |
|--------|--------|
| **Modèles** | `Production`, `ProductionEtape`, `ProductionDossier`, `Machine`, `MaintenanceTicket`, `QualiteControle` |
| **APIs** | `/api/production/*`, `/api/productions/*`, `/api/planning/*`, `/api/machines/*` |

**Problèmes**

| ID | Gravité | Problème |
|----|---------|----------|
| GP-01 | P1 | Pas de service repository — logique dans routes + `lib/services/` |
| GP-02 | P2 | Statuts production en string — pas d'enum Prisma |
| GP-03 | P2 | Lien commande ↔ dossier GPAO parfois implicite |

---

## 8. Studio & BAT

| Aspect | Détail |
|--------|--------|
| **Modèles** | `Proof`, `ProofVersion`, `StudioBrief`, `FileAsset` |
| **APIs** | `/api/proofs/*`, `/api/studio/*`, `/api/bat/*` |

**Problèmes**

| ID | Gravité | Problème |
|----|---------|----------|
| ST-01 | P2 | Fichiers stockés — pas de politique rétention documentée |
| ST-02 | P3 | BAT lié commande — preuve livraison séparée |

---

## 9. Stock & Achats

| Aspect | Détail |
|--------|--------|
| **Modèles** | `StockItem`, `StockMovement`, `StockReservation`, `Supplier`, `PurchaseOrder`, `ImportAnomaly` |
| **APIs** | `/api/stock/*`, `/api/suppliers/*`, `/api/purchase-orders/*` |

**Problèmes**

| ID | Gravité | Problème |
|----|---------|----------|
| SK-01 | P1 | Stock négatif possible selon règles — pas de garde centralisée |
| SK-02 | P2 | Dépendances matière ↔ article POS dans config JSON |
| SK-03 | P2 | `ImportAnomaly` sous-utilisé |

---

## 10. Logistique

| Aspect | Détail |
|--------|--------|
| **Modèles** | `Livraison` |
| **APIs** | `/api/livraisons/*` — **migré** |

**Problèmes**

| ID | Gravité | Problème |
|----|---------|----------|
| L-01 | P1 | Livraison sans adresse possible à la création — contrôle métier au statut Livré seulement |
| L-02 | P2 | Preuve encodée dans `proofNote` JSON/string mixte |

---

## 11. RH

| Aspect | Détail |
|--------|--------|
| **Modèles** | `Employee`, `EmployeePresence`, `Payslip`, `RecruitCandidate`, … |
| **APIs** | `/api/rh/*`, `/api/equipe/*` |

**Problèmes**

| ID | Gravité | Problème |
|----|---------|----------|
| RH-01 | P2 | Lien `User` ↔ `Employee` pas toujours renseigné |
| RH-02 | P3 | Données paie sensibles — audit partiel |

---

## 12. ANS Talk

| Aspect | Détail |
|--------|--------|
| **Modèles** | `TalkConversation`, `TalkMessage`, pièces jointes, réactions |
| **APIs** | `/api/messaging/*` |

**Problèmes**

| ID | Gravité | Problème |
|----|---------|----------|
| T-01 | P1 | `devisId` / `commandeId` sur conversation — orphelins si entité supprimée |
| T-02 | P1 | Permission `messaging:read` absente — `requireAuth` seul |
| T-03 | P2 | 401 intermittents en audit Vercel (timing session) |

---

## 13. Backoffice & Permissions

| Aspect | Détail |
|--------|--------|
| **Modèles** | `RoleModulePermission`, `UserModuleOverride`, `SystemConfig` |
| **UI** | `/administration/*` (20 sections), legacy `/admin/*` |
| **APIs** | `/api/admin/*`, `/api/admin-config/*` |

**Problèmes**

| ID | Gravité | Problème |
|----|---------|----------|
| B-01 | P1 | Pas de page `/administration/data-management` dédiée (dashboard gouvernance) |
| B-02 | P2 | Section `anomalies` existe — pas branchée sur service data-quality central |
| B-03 | P2 | Routes legacy `/admin/*` vs `/administration/*` — redirects partiels |

---

## 14. Dashboard & routes legacy

| ID | Gravité | Problème |
|----|---------|----------|
| R-01 | P1 | 9 routes legacy 404 sur Vercel (`/cockpit`, `/crm/clients`, …) — redirects locaux OK |
| R-02 | P2 | Prefetch RSC erreurs réseau en audit automatisé |

---

## Matrice propriétaire des données (résumé)

| Donnée | Module propriétaire |
|--------|---------------------|
| Client, réclamations | CRM |
| Article, prix, variables, matières | Backoffice |
| Panier | POS |
| Devis | Ventes |
| Commande, blocages | Commandes / GPAO |
| Paiement, facture | Finance |
| Livraison | Logistique |
| Stock, achats | Magasin |
| Production, machines | GPAO |
| Conversation | ANS Talk |
| Permission, config | Administration |

---

## Plan d'action priorisé

### Vague 1 — Documentation ✅ (ce fichier + dictionnaire + modélisation)
### Vague 2 — Stabilisation
- Migrer routes restantes vers `lib/server/modules/`
- Unifier erreurs API `{ ok, data }` / `{ ok, false, error }`
- Indexes Prisma (Client, Commande, Devis, Paiement)

### Vague 3 — Backoffice Data
- CRUD admin réutilisable (`lib/server/crud/`)
- Fiches relationnelles (client → commandes → paiements)

### Vague 4 — Data Quality
- `lib/server/modules/data-quality/` + panneau anomalies

### Vague 5 — Audit log enrichi
- `before`/`after` JSON structuré sur `AuditLog`

### Vague 6 — Import / export
- Voir `docs/DATA_IMPORT_EXPORT_PLAN.md`

### Vague 7 — Dashboard Data Management
- `/administration/data-management` ou onglet Santé enrichi

---

## Références

- `docs/DATA_DICTIONARY.md`
- `docs/DATABASE_MODELING_RECOMMENDATIONS.md`
- `docs/BACKEND_ARCHITECTURE_AUDIT.md`
- `docs/SYNC_MATRIX.md`
- `docs/DATA_MANAGEMENT_10_STEPS_REPORT.md`
