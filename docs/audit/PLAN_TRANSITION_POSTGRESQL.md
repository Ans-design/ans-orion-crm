# Plan transition PostgreSQL (Vague 2) — lecture seule / non exécuté

| Date | 2026-07-18 |
|------|------------|
| Exécution | **BLOQUÉE** jusqu’à backup restaurable + validation propriétaire |

## État actuel

| Environnement | Provider effectif | Commentaire |
|---------------|-------------------|-------------|
| Source locale | `sqlite` dans `schema.prisma` | Conservé (décision) |
| Hostinger build | Patch temporaire → `postgresql` dans `hostinger-prisma-generate.mjs` | Pas de mutation schéma repo |
| Migrations lock | `postgresql` | Drift documenté DB-001 |

## Étapes futures (dry-run uniquement pour l’instant)

1. Confirmer backup PG dump + restauration jetable
2. Inventaire formules (V2-02) + mapping IDs
3. Base staging Neon séparée
4. `prisma migrate deploy` sur staging
5. Réconciliation compteurs / prix / stock
6. Cutover Hostinger
7. Rollback = restore dump

## Interdits maintenant

- Changer `provider` dans le schéma source
- `db push --accept-data-loss`
- Seed production
- Double écriture Hostinger + Vercel même URL

Voir aussi `PLAN_DEPLOIEMENT_HOSTINGER_RC.md`.
