# Dictionnaire de données — ANS ORION

> **Date :** juillet 2026  
> **Objectif :** Une source de vérité métier pour chaque entité critique.  
> **Schéma technique :** `prisma/schema.prisma`

---

## Conventions

| Colonne | Description |
|---------|-------------|
| **Nom métier** | Libellé interface |
| **Nom technique** | Modèle / champ Prisma |
| **Propriétaire** | Module responsable de la donnée |
| **Consommateurs** | Modules qui lisent/écrivent |

---

## Client

| | |
|--|--|
| **Nom métier** | Client CRM |
| **Nom technique** | `Client` |
| **Propriétaire** | CRM |
| **Consommateurs** | POS, Devis, Commandes, Finance, Livraisons, CM, Talk |
| **Description** | Compte client B2B/B2C avec identité fiscale et canaux d'acquisition |

| Champ | Type | Obligatoire | Défaut | Validation | Relations |
|-------|------|-------------|--------|------------|-----------|
| id | String (cuid) | oui | auto | — | PK |
| code | String | oui | auto séquence | unique | — |
| name | String | oui | — | 1–200 car. | — |
| nif | String? | création complète | — | chiffres | — |
| tel, email, whatsapp | String? | non | — | email format | — |
| canalVente, canalDecouverte, canalCommande | String? | non | — | liste métier | — |
| categorie | String | oui | `Client` | Prospect/Client/VIP | → statut |
| statut | String | oui | `Actif` | enum métier | — |
| charte | String? (JSON) | non | — | `parseClientCharte` | adresses, axes livraison |
| archived | Boolean | oui | false | — | soft archive |
| tags | String? (JSON) | non | — | array ≤20 | — |

**Règles :** NIF obligatoire création CRM ; doublons détectés par nom/email/tel ; archivage ≠ suppression.  
**Permissions :** `clients:read`, `clients:write` ; DELETE → archive.  
**Historique :** `AuditLog` entity `Client`.  
**Exemple :** `{ code: "CLI-0042", name: "Telma SA", nif: "1234567890", categorie: "VIP" }`

---

## Adresse / Axe livraison (embarqué)

| | |
|--|--|
| **Nom technique** | Champs dans `Client.charte` (JSON) |
| **Propriétaire** | CRM |
| **Structure** | `{ addresses: [{ label, axe, axeDetail, repere }] }` |

Pas de table `Adresse` dédiée — **recommandation** : modèle relationnel futur (voir modélisation).

---

## Article POS

| | |
|--|--|
| **Nom technique** | Config publiée `AdminConfig` + `Tarif` / `SalePrice2026` |
| **Propriétaire** | Backoffice |
| **Consommateurs** | POS, Devis, Commandes |

| Champ logique | Type | Obligatoire | Notes |
|---------------|------|-------------|-------|
| articleId | string | oui | Clé catalogue |
| label | string | oui | Libellé POS |
| category | string | oui | offset, numérique, GF, … |
| variables | object | non | Snapshot config POS |
| basePrice | number | oui pour vente | Via formule ou forcé |

---

## Variable / Option / Matière / Grammage / Format / Laize

| Entité | Stockage | Propriétaire |
|--------|----------|--------------|
| Variable pricing | `PricingVariable`, config JSON | Backoffice |
| Option | `ProductOptionGroup`, `ProductOptionValue` | Backoffice |
| Matière | `MaterialCatalog`, `MaterialPrice` | Backoffice |
| Grammage | `GrammageCatalog` | Backoffice |
| Format | Config article + catalog | Backoffice |
| Laize GF | Config + `lib/grand-format/laize-fallbacks` | Backoffice / Stock |

---

## Devis

| | |
|--|--|
| **Nom technique** | `Devis`, `DevisLigne` |
| **Propriétaire** | Ventes |
| **Consommateurs** | Commandes, Finance, Talk |

| Champ | Type | Obligatoire | Statuts |
|-------|------|-------------|---------|
| numero | String | oui | unique DEV-xxx |
| clientId | String? | non | FK Client |
| statut | String | oui | Brouillon → Expiré |
| sousTotal, remise, totalHT, totalTTC | Float | oui | recalcul lignes |
| validUntil | DateTime? | non | défaut 30j |
| lignes[].configSnapshot | Json | oui | figé à la création |

---

## Commande

| | |
|--|--|
| **Nom technique** | `Commande`, `CommandeLigne` |
| **Propriétaire** | Commandes / GPAO |
| **Consommateurs** | Production, Finance, Livraisons, Talk |

| Champ | Type | Obligatoire | Notes |
|-------|------|-------------|-------|
| numero | String | oui | CMD-xxx |
| statut | String | oui | workflow GPAO |
| total, acompte, reste | Float | oui | sync paiements |
| configSnapshot | Json? | non | config POS figée |
| priorite | String | oui | Normal, Urgente, … |

---

## Paiement

| | |
|--|--|
| **Nom technique** | `Paiement` |
| **Propriétaire** | Finance |
| **Consommateurs** | Commandes, Factures, Dashboard |

| Champ | Type | Obligatoire | Validation |
|-------|------|-------------|------------|
| numero | String | oui | PAY-xxx |
| montant | Float | oui | > 0, ≤ reste dû |
| mode | String | oui | Espèces, Virement, Mobile Money, … |
| type | String | oui | Acompte, Solde, Remboursement |
| factureId / commandeId / clientId | String? | un lien requis | Zod refine |

---

## Facture

| | |
|--|--|
| **Nom technique** | `Facture` |
| **Propriétaire** | Finance |
| **Consommateurs** | Paiements, Clients, Commandes |

| Champ | Type | Obligatoire | Statuts |
|-------|------|-------------|---------|
| numero | String | oui | FAC-xxx |
| lignes | Json | oui | array {description, qty, pu, total} |
| statut | String | oui | Brouillon → Annulée |
| totalTTC | Float | oui | HT + TVA |

---

## Livraison

| | |
|--|--|
| **Nom technique** | `Livraison` |
| **Propriétaire** | Logistique |
| **Consommateurs** | Commandes, SAV |

| Champ | Type | Obligatoire | Notes |
|-------|------|-------------|-------|
| commandeId | String | oui | FK |
| adresseLiv | String? | recommandé | requis preuve Livré |
| statut | String | oui | Préparation → Retour |
| proofPhotoUrl, proofNote | String? | si Livré | preuve obligatoire |

---

## Stock

| | |
|--|--|
| **Nom technique** | `StockItem`, `StockMovement` |
| **Propriétaire** | Magasin |
| **Consommateurs** | POS, Production |

---

## Employé / Permission

| Entité | Modèle | Propriétaire |
|--------|--------|--------------|
| Employé | `Employee` | RH |
| Utilisateur | `User` | Auth |
| Permission module | `RoleModulePermission` | Administration |
| Override user | `UserModuleOverride` | Administration |

---

## Audit log

| | |
|--|--|
| **Nom technique** | `AuditLog` |
| **Propriétaire** | Administration / transverse |

| Champ | Type | Description |
|-------|------|-------------|
| action | String | CREATE, UPDATE, STATUS_CHANGE, … |
| entity | String | Client, Commande, … |
| entityId | String? | cuid cible |
| details | String? | JSON libre |
| userId, userName | String? | auteur |

**Manque actuel :** champs `before` / `after` structurés (recommandé étape 8).

---

## Conversation ANS Talk

| | |
|--|--|
| **Nom technique** | `TalkConversation`, `TalkMessage` |
| **Propriétaire** | ANS Talk |
| **Liens** | clientId, devisId, commandeId optionnels |

---

## Index des entités documentées

Client · Adresse (charte) · Article · Variable · Option · Matière · Grammage · Format · Laize · Prix · Formule · Stock · Panier (session) · Devis · Commande · Paiement · Facture · Livraison · Production · BAT · Fichier · Talk · Employé · Permission · AuditLog · Notification

---

## Références

- `docs/DATA_MANAGEMENT_AUDIT.md`
- `docs/DATABASE_MODELING_RECOMMENDATIONS.md`
- `prisma/schema.prisma`
