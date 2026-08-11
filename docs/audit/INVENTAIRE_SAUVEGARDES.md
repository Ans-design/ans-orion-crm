# Inventaire bases et sauvegardes (lecture seule)

| Date | 2026-07-18 |
|------|------------|
| Méthode | Scan fichiers — aucun secret affiché, aucune mutation |
| Décision | SQLite conservée en lecture seule ; cible long terme PostgreSQL partout |

## Copie de travail confirmée

| Sentinelle | Présent |
|------------|---------|
| package.json | Oui |
| app/ | Oui |
| lib/ | Oui |
| components/ | Oui |
| prisma/ | Oui |

**Git :** non initialisé (conforme à la décision — pas de `git init`).

## Fichiers `.db` trouvés

| Chemin | Taille | Nature |
|--------|--------|--------|
| `prisma/dev.db` | ~8,8 Mo | SQLite **locale de travail** (seed/restore catalogue) — **pas** une sauvegarde métier historique vérifiée |
| `prisma/dev.db.backup-restored-20260718` | ~8,8 Mo | Copie de la DB locale après restore catalogue — **pas** l’ancienne base custom |

## Archives ZIP parent

`PROJET AVANT FINAL.zip` / `… - Copie.zip` : **6 entrées « db-like »** = uniquement `prisma/migrations/*.sql` (schéma), **aucun** `dev.db` / dump métier.

## Neon / Postgres

| Élément | Résultat |
|---------|----------|
| Dossier `.neon` | Présent, ~40 o — **pas** un dump de données |
| Port 5432 local | Non joignable (session précédente) |
| Dump `.sql` métier hors migrations | **Aucun** trouvé sous Documents/Downloads/Desktop (scan) |
| Credentials Neon vérifiables | **Aucun** dans le dépôt (exemples uniquement) |

## Conclusion sauvegarde

**Aucune sauvegarde restaurable des formules personnalisées / données métier historiques n’a été trouvée.**

Tant qu’une telle sauvegarde n’existe pas :

- pas de migration provider ;
- pas de seed / backfill / repair / fusion ;
- SQLite locale = environnement de travail reconstruit depuis le catalogue code uniquement.

## Action si une sauvegarde apparaît

1. Copier hors du projet (lecture seule).
2. Dry-run inventaire tables (counts formules, règles).
3. Demander validation humaine avant tout restore.
