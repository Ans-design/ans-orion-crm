# Audit base de données — ANS ORION

> **Date :** juin 2026  
> **ORM :** Prisma 6.x  
> **Schéma :** `prisma/schema.prisma` (~99 modèles, ~2000 lignes)

---

## Environnements

| Environnement | Provider | URL typique | Notes |
|---------------|----------|-------------|-------|
| **Local dev** | SQLite | `file:./prisma/demo.db` | `LOCAL_DEV=true`, seeds `scripts/seed*.ts` |
| **Vercel prod** | PostgreSQL | `postgres://...` | Migrations via `scripts/vercel-build.mjs`, schema patch runtime |
| **Hostinger** | PostgreSQL | variable | `scripts/hostinger-prisma-generate.mjs` |

**Règle :** le schéma Prisma est la source de vérité. Tout champ UI/API doit exister dans le schéma + migration.

---

## Modèles critiques (flux commercial)

| Modèle | Usage | Relations clés |
|--------|-------|----------------|
| `Client` | CRM, POS, devis | commandes, devis, factures |
| `Devis` | Ventes | client, lignes, versions |
| `Commande` | Production, livraison | client, lignes, workflow, facture |
| `Facture` | Finance | client, paiements |
| `Paiement` | Caisse, finance | facture, commande |
| `StockItem` | POS, GPAO | mouvements, réservations |
| `User` | Auth NextAuth | sessions, permissions |
| `TalkConversation` | Messagerie | membres, messages |
| `Employe` / RH | Pointage, paie | userId, présences |
| `SalePrice2026` | Pricing fusion | articles POS |
| `AdminConfigVersion` | Backoffice | publish → POS |

---

## État actuel

### Points forts
- Schéma **complet** couvrant CRM, GPAO, finance, RH, messagerie, studio.
- **Migrations** présentes (`prisma/migrations/`).
- **Seeds modulaires** (demo, stock, RH, finance, workflows…).
- Scripts **Postgres patch** pour Vercel (`lib/postgres-prisma-patch`).

### Risques identifiés

| Gravité | Sujet | Action |
|---------|-------|--------|
| P1 | `schema.prisma` provider = `sqlite` en repo | Normal — Postgres via env + patch deploy Vercel |
| P1 | ~90 routes importent Prisma directement | Migrer vers `lib/server/db/prisma` + repositories |
| P2 | Indexes manquants sur recherches fréquentes | Ajouter `@@index` sur `Client.email`, `Commande.statut`, `Devis.statut` (à valider charge) |
| P2 | Seeds multiples non orchestrés | Documenter `scripts/seed.ts` comme entrypoint |
| P2 | Champs JSON `config` sur lignes panier/devis | Valider taille + schéma Zod côté API |

---

## Commandes de validation

```bash
npx prisma validate
npx prisma generate
npm run db:migrate          # deploy migrations
npm run test                # tests Prisma-related
curl http://127.0.0.1:3020/api/health/db
curl http://127.0.0.1:3020/api/health/system
```

---

## Compatibilité local ↔ Vercel

| Aspect | Local | Vercel |
|--------|-------|--------|
| Provider | SQLite | PostgreSQL |
| Migrations | `db push` / migrate dev | `prisma migrate deploy` build |
| Seed | `scripts/seed-demo.ts`, E2E seed | Données prod / demo account |
| `DATABASE_URL` | `.env.local` | Variables Vercel |

**Ne pas** utiliser de SQL raw spécifique SQLite en prod sans garde `isPostgres()`.

---

## Migrations recommandées (futures)

1. Index composite `Commande(clientId, createdAt)` pour historique client.
2. Index `Devis(statut, validUntil)` pour expiration cron.
3. Vérifier contraintes FK `onDelete` messagerie / commandes.

---

## Seeds documentés

| Script | Contenu |
|--------|---------|
| `scripts/seed.ts` | Entry principal |
| `scripts/seed-demo.ts` | Compte démo Vercel |
| `scripts/seed-stock.ts` | Stock GF laizes |
| `scripts/seed-rh.ts` | Employés RH |
| `scripts/seed-finance.ts` | Données finance |
| `e2e-start.mjs` | Seed E2E SQLite |

---

## Critères de succès étape 5

- [x] Audit documenté
- [x] Modèles critiques listés
- [x] Compatibilité local/Vercel documentée
- [ ] Indexes ajoutés après profiling
- [ ] Repositories pour réduire accès Prisma direct
