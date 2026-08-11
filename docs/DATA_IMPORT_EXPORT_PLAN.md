# Plan import / export / synchronisation — ANS ORION

> **Date :** juillet 2026

---

## État actuel

| Canal | Endpoint | UI | Types |
|-------|----------|-----|-------|
| **Métier global** | `POST /api/import`, `GET /api/export` | `parametres/donnees` | clients, tarifs, devis, commandes, factures, paiements, regles, formules, audit, all |
| **Config backoffice** | `admin-config/import|export` | pricing-v4 import-export panel | JSON versions draft/published |
| **Articles** | `backoffice/articles` | backoffice | JSON catalogue |
| **Rapports** | `reports/export` | rapports | CSV/JSON selon type |
| **Anomalies** | modèle `ImportAnomaly` | section anomalies (partielle) | erreurs import |

---

## Formats cibles

| Format | Usage | Priorité |
|--------|-------|----------|
| **JSON** | Config admin, backup complet | ✅ existant |
| **CSV** | Clients, stock, finance (Excel) | À renforcer |
| **Excel (.xlsx)** | Rapports direction | P3 |

---

## Règles import métier

1. **Permission** `import:run` obligatoire.
2. **Mode** `merge` (défaut) ou `replace` — documenter par type.
3. **Validation Zod** avant écriture — pas de boucle Prisma sans schéma.
4. **Aperçu** : réponse `{ preview: true, valid, errors[] }` avant commit (à implémenter).
5. **Rollback** : transaction Prisma par batch ; échec → `ImportAnomaly` + audit.
6. **Rapport** : `{ imported, skipped, errors: [{ row, field, message }] }`.

### Types import actuels

| type | Champs requis | Upsert key |
|------|---------------|------------|
| clients | code, name | code |
| tarifs | articleId | articleId |

### Types à étendre (vague 6)

- stock (SKU, qty)
- fournisseurs
- prix SalePrice2026
- employés (RH admin)

---

## Règles export métier

1. Permission `export:read` ou module-specific.
2. Filtres date / statut sur commandes, factures, paiements.
3. Pas de secrets (.env, tokens) dans export `all`.
4. Audit log sur export massif (`action: EXPORT`).

### Types export (`GET /api/export?type=`)

`clients` · `devis` · `commandes` · `factures` · `paiements` · `tarifs` · `regles` · `formules` · `audit` · `all`

---

## Synchronisation inter-modules

Document détaillé : `docs/SYNC_MATRIX.md`, `lib/server/sync/commercial-flow.ts`

| Flux | Déclencheur | Cible |
|------|-------------|-------|
| Backoffice publish | `admin-config/publish` | POS catalogue |
| Devis accepté | `devis-acompte-service` | Commande |
| Paiement | `afterPaiementRecorded` | Commande.reste, Facture.statut |
| Livraison créée | `syncCommandeOnLivraisonCreated` | Commande statut |
| Livraison Livré | `transitionCommandeStatut` | Commande → Livré |
| Devis créé | `createDevisConversation` | Talk |

**Dashboard sync :** afficher dernière publication config, dernier sync stock, anomalies ouvertes.

---

## Endpoints à créer (vague 6)

| Endpoint | Rôle |
|----------|------|
| `POST /api/import/preview` | Validation sans écriture |
| `GET /api/export/catalog-pos` | Export catalogue publié POS |
| `POST /api/admin/sync/run` | Resync manuelle (admin) |
| `GET /api/admin/data-quality` | Anomalies agrégées |

---

## UI admin prévue

- **Import** : upload → aperçu tableau → confirmer → rapport
- **Export** : choix type + filtres → téléchargement
- **Sync** : bouton « Republier catalogue », « Vérifier cohérence »

Section existante : `/administration/import-export`

---

## Risques

| Risque | Mitigation |
|--------|------------|
| Import massif timeout | Batch 100 lignes + job async futur |
| Doublons clients | merge par code + détection doublons |
| CSV encodage | UTF-8 BOM pour Excel |
| Replace destructif | Confirmation UI + permission admin |

---

## Tests obligatoires

- Import clients valides / invalides
- Export `all` sans champs sensibles
- Round-trip tarifs merge
- Rollback transaction sur erreur ligne 50/100

---

## Références

- `app/api/import/route.ts`
- `app/api/export/route.ts`
- `app/api/admin-config/import/route.ts`
- `docs/STOCK_FINANCE_SYNC.md`
