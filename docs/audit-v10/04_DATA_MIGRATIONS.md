# Migrations données (V10)

- Pas de `prisma db push` en production.
- Pas de `--accept-data-loss` en production.
- Provider Prisma : pas de remplacement texte au build.
- Montants : migration Float → Decimal/entier progressive (DATA-003).
- Paiements : clé idempotente UNIQUE (DATA-006).

Statut initial Vague 1 : inventaire + contraintes sûres uniquement.
