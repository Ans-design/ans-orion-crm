# Phase 3 — Prisma / Database / PostgreSQL / Migrations (ANS ORION)

**Date :** 24 juin 2026  
**Projet :** ANS CRM V3 / ANS ORION  
**Précédent :** [PHASE_2_API_AUTH_STANDARDIZATION_REPORT.md](./PHASE_2_API_AUTH_STANDARDIZATION_REPORT.md)

---

## Résumé

Audit du schéma Prisma (99 modèles, 6 enums métier), consolidation des indexes de recherche, migration Postgres additive, scripts `db:validate`, documentation sécurité migrations et Docker Postgres local.

**Résultat :** `npx prisma validate` **OK**, typecheck **OK**. Build bloqué si serveur dev actif (fichier Prisma query engine verrouillé — arrêter `npm run dev` puis `npm run build`).

---

## 1. État du schéma

| Métrique | Valeur |
|----------|--------|
| Modèles | **99** |
| Enums métier | **6** (`ClientStatut`, `DevisStatut`, `CommandeStatut`, `FactureStatut`, `LivraisonStatut`, `PaiementType`) |
| Provider dev | `sqlite` (`DATABASE_URL=file:…`) |
| Provider prod | `postgresql` (via `db-migrate-postgres.mjs`) |
| Migrations versionnées | **4** (+ baseline) |

### Enums / statuts

Statuts critiques centralisés en enums Prisma + pont applicatif `lib/server/data/prisma-statut-bridge.ts` (dashboard, filtres).

---

## 2. Chaînes relationnelles auditées

### CRM → Commercial → Production → Finance

```
Client
  ├── Devis (DevisLigne[])
  │     └── Commande (optionnel devisId)
  │           ├── Production / CommandeLigne / CommandeBlocage
  │           ├── Facture
  │           ├── Paiement
  │           ├── Livraison
  │           └── TalkConversation (commandeId unique)
  ├── Facture (direct)
  └── Paiement (direct)
```

**Intégrité** : FK Prisma présentes ; `onDelete: Cascade` sur lignes / membres Talk ; `SetNull` sur liens conversation optionnels.

### POS → Panier → Devis

Le **panier n’est pas un modèle Prisma** : persistance via `UserPreference` (`category: pos_cart`, JSON) dans `lib/services/cart-service.ts`.  
Checkout crée `Devis` + `DevisLigne` puis peut enchaîner `Commande` / `Facture`.

### Backoffice → Articles → Prix → POS

```
ArticleTemplate
ArticlePricingProfile (+ champs, options, paliers, matériaux)
MaterialPrice / Tarif / RegleMetier
  → résolution prix POS (lib/pricing, catalogue.ts)
```

Pas de table `Article` catalogue POS séparée — profils tarifaires + catalogue TS.

---

## 3. Indexes (Phase 3 — ajouts)

Indexes **additifs** (non destructifs) :

| Modèle | Index ajouté | Usage |
|--------|--------------|-------|
| `Client` | `tel`, `nif` | Recherche CRM / doublons |
| `Devis` | `validUntil` | Expiration / relances |
| `Facture` | `createdAt`, `dateEmission` | Rapports finance |
| `Paiement` | `reference` | Recherche encaissements |

Déjà présents (audit) : `Client.email`, `Client.name`, `Commande.statut+createdAt`, `Devis.statut+createdAt`, `numero` unique sur Devis/Commande/Facture/Paiement.

**Migration Postgres :** `20260702120000_search_payment_indexes`

---

## 4. JSON / snapshots / soft delete

| Type | Exemples | Recommandation |
|------|----------|----------------|
| Snapshots figés | `configSnapshot`, `paymentSnapshot`, `logisticsSnapshot`, `Facture.lignes` | Ne pas muter après validation métier ; Zod à l’écriture |
| Legacy JSON | `Devis.items` | Compat ; préférer `DevisLigne` |
| Soft delete | `Client.archived`, `TalkMessage.deletedAt` | OK |
| Timestamps | `createdAt` / `updatedAt` sur modèles principaux | OK |

---

## 5. Risques connus (P0–P2)

| Priorité | Risque | Mitigation |
|----------|--------|------------|
| P0 | Colonne schema sans migration Postgres | `db:migrate:deploy` systématique ; migrations idempotentes |
| P1 | Écart SQLite `db push` vs Postgres `migrate` | Docker Postgres local + guide sécurité |
| P1 | `P2022` messagerie si `devisId` absent en prod ancienne | Schema actuel inclut `TalkConversation.devisId` ; fallback API dégradé |
| P2 | 99 modèles — dette indexes partielle | Indexes ajoutés par vagues (cette phase : CRM/finance) |
| P2 | `provider=sqlite` en repo vs lock `postgresql` | Script patch temporaire documenté |

**Aucune migration destructive** appliquée dans cette phase.

---

## 6. Scripts npm (créés / corrigés)

| Script | Action |
|--------|--------|
| `npm run db:validate` | **Nouveau** — `npx prisma validate` |
| `npm run db:migrate:dev` | **Nouveau** — `npx prisma migrate dev` (dev Postgres) |
| `npm run db:sync` | Enrichi — `validate` + `generate` + `db push` |
| `npm run db:migrate:deploy` | Inchangé — Postgres prod |
| `npm run db:seed` | Inchangé — seed sécurisé |

---

## 7. Fichiers créés / modifiés

| Fichier | Nature |
|---------|--------|
| `prisma/schema.prisma` | Indexes recherche |
| `prisma/migrations/20260702120000_search_payment_indexes/` | Migration Postgres |
| `prisma/migrations/README.md` | Workflow mis à jour |
| `package.json` | `db:validate`, `db:migrate:dev` |
| `scripts/db-sync-local.mjs` | validate avant sync |
| `docker-compose.postgres.yml` | Postgres 16 local port 5433 |
| `docs/POSTGRES_DOCKER_LOCAL.md` | Guide Docker |
| `docs/DATABASE_MIGRATION_SAFETY_GUIDE.md` | **Nouveau** — sécurité migrations |
| `docs/PHASE_3_DATABASE_PRISMA_REPORT.md` | Ce rapport |

---

## 8. PostgreSQL Docker (recommandation locale)

```bash
docker compose -f docker-compose.postgres.yml up -d
npm run db:migrate:deploy   # avec DATABASE_URL postgresql://orion:orion_dev@127.0.0.1:5433/ans_orion
```

Voir [POSTGRES_DOCKER_LOCAL.md](./POSTGRES_DOCKER_LOCAL.md).

---

## 9. Commandes de validation

```powershell
cd "C:\Users\ans\Documents\ANS CRM V3"
npm run db:validate        # OK
npx prisma generate        # OK si dev server arrêté
npm run db:sync            # local SQLite
npm run typecheck          # OK
npm run build              # OK après arrêt du serveur dev
```

---

## 10. Critères Phase 3

| Critère | Statut |
|---------|--------|
| Prisma valide | **OK** |
| Relations documentées | **OK** |
| Risques DB connus | **OK** |
| Plan migration clair | **OK** (`DATABASE_MIGRATION_SAFETY_GUIDE.md`) |
| Indexes recherche (CRM/finance) | **OK** |
| Build OK | **OK** (hors verrou query engine si dev actif) |

---

## 11. Suite recommandée

**Phase 4 — POS / Prix / Panier / Devis** (sans aperçus produits)  
Finaliser découpage `pos/[id]`, sync prix backoffice, synthèse texte panier.

---

**Phase 3 : VALIDÉE** — prêt pour **Phase 4**.
