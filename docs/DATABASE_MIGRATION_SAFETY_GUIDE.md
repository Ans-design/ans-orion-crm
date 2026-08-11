# Guide sécurité migrations — ANS ORION

Ce document décrit les pratiques pour éviter les pertes de données et les écarts SQLite local / PostgreSQL production.

---

## Principes

1. **Pas de migration destructive** sans backup explicite et fenêtre de maintenance.
2. **Pas de `migrate reset`** sur Neon / Vercel production.
3. **Préférer `ALTER … ADD COLUMN IF NOT EXISTS`** et `CREATE INDEX IF NOT EXISTS` pour Postgres.
4. **Local SQLite** : `npm run db:sync` (`db push`) — ne crée pas d’historique migrate identique à Postgres, mais aligne le schéma.
5. **Production** : toujours `npm run db:migrate:deploy` après revue du SQL de migration.

---

## Commandes par risque

| Commande | Risque | Usage |
|----------|--------|-------|
| `npm run db:validate` | Aucun | CI / avant commit schema |
| `npm run db:generate` | Aucun | Régénère le client Prisma |
| `npm run db:sync` | Faible (local) | Push schema → `dev.db` |
| `npm run db:migrate:deploy` | Moyen | Applique migrations Postgres |
| `npx prisma db push` (prod) | **Élevé** | Repli uniquement si migrate échoue |
| `npx prisma migrate reset` | **Critique** | **Jamais en prod** |
| `DROP TABLE` / `DROP COLUMN` | **Critique** | Éviter ; soft-delete préféré |

---

## Avant une migration production

1. **Backup** Neon : snapshot ou `pg_dump` (voir console Neon).
2. **Relire** le fichier `prisma/migrations/*/migration.sql`.
3. **Tester** sur Postgres Docker local (`docker-compose.postgres.yml` + `docs/POSTGRES_DOCKER_LOCAL.md`).
4. **Déployer** : `npm run db:migrate:deploy`.
5. **Vérifier** : `GET /api/health/db`, smoke login, dashboard, messagerie.

---

## Rollback

Prisma ne fait pas de rollback automatique.

| Situation | Action |
|-----------|--------|
| Migration additive (index, colonne nullable) | Laisser en place ; corriger l’app si besoin |
| Migration incorrecte non déployée | Supprimer le dossier migration non appliqué |
| Migration déployée avec erreur | Restaurer backup Postgres ; créer migration corrective |
| Client Prisma désynchronisé | `npx prisma generate` + redeploy |

---

## SQLite local vs PostgreSQL prod

| Aspect | Local | Production |
|--------|-------|------------|
| Provider | sqlite | postgresql |
| Sync | `db push` | `migrate deploy` |
| Enums | Natifs Prisma | Natifs Prisma |
| JSON | Supporté | Supporté (`Json`) |
| `IF NOT EXISTS` | Index OK | Colonnes via migrations idempotentes |

**Piège connu** : une colonne ajoutée au `schema.prisma` mais sans migration Postgres → erreurs `P2022` / `column does not exist` en prod (ex. messagerie `devisId` — corrigé dans baseline + schema actuel).

---

## Champs JSON / snapshots

Autorisés pour figer l’état métier :

- `Devis.items`, `Commande.configSnapshot`, `Commande.paymentSnapshot`
- `DevisLigne.configSnapshot`, `Facture.lignes`
- `Devis.logisticsSnapshot`

**Recommandation** : valider côté app avec Zod avant écriture ; ne pas muter un snapshot après acceptation commande.

---

## Soft delete

| Modèle | Mécanisme |
|--------|-----------|
| `Client` | `archived` + `archivedAt` |
| `TalkMessage` | `deletedAt` |
| Autres | Pas de `deletedAt` global — suppression réelle avec `onDelete: Cascade` sur relations |

---

## Seeds

| Script | Usage |
|--------|-------|
| `npm run db:seed` / `npm run seed` | Seed sécurisé local |
| `npm run seed:demo` | Données démo |
| `npm run seed:production` | **Prod uniquement** avec garde-fous script |
| `npm run seed:incremental` | Compléments sans écraser |

Ne pas lancer `seed:demo` sur une base production client.

---

## Checklist release DB

- [ ] `npm run db:validate`
- [ ] `npx prisma generate`
- [ ] Migration SQL relue
- [ ] Test sur Postgres Docker (optionnel mais recommandé)
- [ ] Backup prod
- [ ] `npm run db:migrate:deploy`
- [ ] Smoke post-déploiement

---

## Contacts / docs liées

- [PHASE_3_DATABASE_PRISMA_REPORT.md](./PHASE_3_DATABASE_PRISMA_REPORT.md)
- [DATABASE.md](./DATABASE.md)
- [POSTGRES_DOCKER_LOCAL.md](./POSTGRES_DOCKER_LOCAL.md)
- `prisma/migrations/README.md`
