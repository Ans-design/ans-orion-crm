# ANS ORION — Base de données

## Provider

| Environnement | Provider | URL |
|---------------|----------|-----|
| Dev local | SQLite | `file:./dev.db` |
| Prod Hostinger | **PostgreSQL** (Neon) | `DATABASE_URL` avec `sslmode=require` |

> Le guide Hostinger historique mentionnait MySQL. Le déploiement actuel utilise **PostgreSQL Neon** via `DATABASE_URL`. Le schéma Prisma est compatible Postgres ; `provider` dev dans schema peut être `sqlite`.

## Fichiers

- `prisma/schema.prisma` — **99 modèles**, 6 enums métier
- `prisma/migrations/` — migrations PostgreSQL versionnées (voir `prisma/migrations/README.md`)
- `lib/prisma.ts` — client singleton Next.js
- `docker-compose.postgres.yml` — Postgres local (parité prod, optionnel)

## Modèles métier principaux

- **Auth** : User, Account, Session
- **Commercial** : Client, Devis, DevisLigne, Commande, CommandeLigne
- **Pricing** : ArticlePricingProfile, ArticleTemplate, MaterialPrice, Tarif
- **Stock** : StockItem, StockMovement, StockReservation
- **Production** : Production, ProductionDossier, ProductionEtape, Machine
- **Finance** : Facture, Paiement
- **RH** : Employee, EmployeePresence, Payslip
- **Talk** : TalkConversation, TalkMessage
- **Panier POS** : `UserPreference` (JSON, pas de table Cart dédiée)

## Catalogue articles

`ArticlePricingProfile` est la cible pour profils tarifaires backoffice.  
Le fichier `lib/data/catalogue.ts` reste seed/fallback — migration progressive documentée dans `docs/DATABASE_SCHEMA_PROPOSAL.md`.

## Commandes utiles

```bash
npm run db:validate
npm run db:generate
npm run db:sync           # local SQLite (validate + push)
npm run db:migrate:deploy # Postgres Neon / Vercel
npm run db:push:neon
npm run seed
```

Sécurité migrations : [DATABASE_MIGRATION_SAFETY_GUIDE.md](./DATABASE_MIGRATION_SAFETY_GUIDE.md)

## Health

- `GET /api/health/db` — probe Prisma `SELECT 1`
