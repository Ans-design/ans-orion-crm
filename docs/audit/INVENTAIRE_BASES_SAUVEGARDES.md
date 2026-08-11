# Inventaire bases & sauvegardes — Vague 2

| Date | 2026-07-18 |
|------|------------|
| Méthode | Lecture seule — enrichit `INVENTAIRE_SAUVEGARDES.md` |

Voir détail V1 : [`INVENTAIRE_SAUVEGARDES.md`](./INVENTAIRE_SAUVEGARDES.md).

## Synthèse Vague 2

| Candidat | Type | Restaurable métier ? | Statut |
|----------|------|----------------------|--------|
| `prisma/dev.db` | SQLite locale | Partiel (catalogue restauré) | Lecture seule |
| `prisma/dev.db.backup-restored-*` | Copie locale | Catalogue only | Lecture seule |
| ZIPs parent | migration.sql | Non (pas de dump data) | Inutile métier |
| Neon `.neon` | stub ~40 o | Non | Ignorer |
| Hostinger / Neon prod dump | — | **MANQUANT** | Bloque migrate |

**Verdict :** aucune sauvegarde métier PostgreSQL restaurable confirmée → migrations / seeds / repair **interdits**.
