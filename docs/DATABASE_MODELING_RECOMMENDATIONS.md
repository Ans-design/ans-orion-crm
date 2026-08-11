# Recommandations modélisation Prisma — ANS ORION

> **Date :** juillet 2026  
> **Schéma :** `prisma/schema.prisma` (99 modèles)

---

## Principes directeurs

1. **id + createdAt + updatedAt** sur tout modèle métier critique ✅ (déjà majoritaire).
2. **Soft delete** via `archived` / `deletedAt` — Client utilise `archived` ; généraliser si besoin corbeille.
3. **Enums Prisma** pour statuts stables — migration progressive depuis `String`.
4. **Indexes** sur champs filtrés / triés / FK.
5. **JSON** uniquement pour snapshots figés ou config dynamique admin — pas pour données relationnelles stables.

---

## Modèles à corriger (priorité)

| Priorité | Modèle | Problème | Recommandation |
|----------|--------|----------|----------------|
| P1 | `Facture` | `lignes` en JSON | Option A : garder JSON + Zod strict ; Option B : `FactureLigne` (migration lourde) |
| P1 | `Client` | adresses en `charte` JSON | Introduire `ClientAddress` (1-N) à terme |
| P2 | `Commande` | pas de `paymentSnapshot` | Champ Json optionnel rempli à l'encaissement |
| P2 | `Devis` | pas de `logisticsSnapshot` | Json à l'acceptation (adresse, axe, contact) |
| P2 | `TalkConversation` | FK optionnelles orphelines | `onDelete: SetNull` + job data-quality |
| P3 | `Devis` | pas de `DevisVersion` | Table versions si historique légal requis |

---

## Relations manquantes ou à renforcer

| Relation | État | Action |
|----------|------|--------|
| Client → Adresses | JSON | Modèle `ClientAddress` |
| Article POS → StockItem | indirect config | Documenter mapping dans backoffice |
| Commande → Livraison | 1-N OK | — |
| Devis → Commande | 1-N OK | — |
| Employee → User | optionnel | Contrainte métier RH à l'embauche |

---

## Indexes recommandés

### Déjà ajoutés (migration `20260701190000_client_search_indexes`)

- `Client.email`, `Client.name`, `Client.[archived, updatedAt]`

### À ajouter (non destructif)

```prisma
// Commande — listes & kanban
@@index([statut])
@@index([clientId])
@@index([createdAt])
@@index([statut, createdAt])

// Devis — déjà partiel
@@index([statut, createdAt])

// Paiement — finance
@@index([clientId])
@@index([commandeId])
@@index([factureId])
@@index([datePaiement])

// Facture
@@index([statut])
@@index([clientId])
@@index([commandeId])

// Livraison
@@index([commandeId])
@@index([statut])

// AuditLog — recherche entité
@@index([entity, entityId])
```

**Note local :** `prisma migrate dev` peut échouer si lock PostgreSQL vs SQLite — utiliser `prisma db push` en dev ou appliquer SQL manuellement.

---

## Enums proposés (migration progressive)

| Enum | Valeurs actuelles (strings) |
|------|----------------------------|
| `ClientStatut` | Actif, Premium, VIP, Inactif, Archivé, Prospect |
| `DevisStatut` | Brouillon, Envoyé, En attente, Accepté, Refusé, Expiré |
| `CommandeStatut` | voir `COMMANDE_STATUTS` dans code |
| `FactureStatut` | Brouillon, Émise, Payée, Partiellement payée, Annulée |
| `LivraisonStatut` | Préparation, Prêt, En livraison, Livré, Retour |
| `PaiementType` | Acompte, Solde, Remboursement |

**Stratégie :** enum Prisma + mapper legacy strings pendant 1 sprint — pas de big-bang.

---

## Champs obsolètes / à renommer

| Champ | Modèle | Note |
|-------|--------|------|
| `article` (string) | Commande | Legacy — préférer `CommandeLigne` |
| `items` | Devis | Legacy Json — `DevisLigne` est source |
| `ca`, `cmds` | Client | Dénormalisation — recalculer via vues ou jobs |

---

## Snapshots recommandés

| Entité | Champ | Quand remplir |
|--------|-------|---------------|
| DevisLigne | configSnapshot | Création ligne |
| Commande | configSnapshot | Conversion devis → commande |
| Commande | paymentSnapshot | Après chaque paiement (proposé) |
| Devis | logisticsSnapshot | Acceptation devis (proposé) |

---

## Risques de migration

| Migration | Risque | Mitigation |
|-----------|--------|------------|
| FactureLigne table | Haute — données JSON existantes | Script migration + rollback |
| ClientAddress | Moyenne | Import depuis charte JSON |
| Enums statuts | Moyenne | Valeurs invalides en prod → audit préalable |
| Indexes | Faible | `CREATE INDEX CONCURRENTLY` Postgres |

---

## Champs à vérifier (code ↔ DB)

| Champ | Statut |
|-------|--------|
| `Client.canalVente` | ✅ présent |
| `TalkConversation.devisId` | ✅ présent |
| `TalkConversation.commandeId` | ✅ présent |
| `Commande.paymentSnapshot` | ❌ absent — recommandé |
| `Devis.logisticsSnapshot` | ❌ absent — recommandé |

---

## Commandes validation

```bash
npx prisma validate
npx prisma format
npx prisma generate
```

---

## Références

- `docs/DATABASE_AUDIT.md`
- `docs/DATA_DICTIONARY.md`
- `lib/data/status-registry.ts`
