# Décisions en attente — ANS ORION

| Date | 2026-07-19 (Vague Finale) |
|------|--------------------------|

## Décisions déjà tranchées

| ID | Décision |
|----|----------|
| D-001 | Pas de `git init` / commit / push — copie de travail confirmée |
| D-002 | Cible long terme **PostgreSQL partout** ; SQLite locale temporaire ; **pas** de changement provider sans backup |
| D-003 | Aucune sauvegarde métier vérifiable trouvée — `INVENTAIRE_SAUVEGARDES.md` |
| D-004 | Pas de seed / backfill / repair tant qu’il n’y a pas de backup restaurable |
| D-005 | **Hostinger = production principale** ; Vercel+Neon = staging/preview séparés |
| D-007-V2 | Vague 2 — correctifs Hostinger + auth P0 ; **pas** de déploiement réel sans backup |
| D-008-V2 | V2-02R sans PDF ; C01–C06 non codés aveuglément |
| D-011 | Consommation stock à fin production **OUI** (Prête / Livré) + release Annulée |
| D-013-VF | Radius design system **7px** (règle maître) — tokens/tests alignés Vague Finale |
| D-014-VF | ANS Talk : badge flottant → `/messagerie` plein écran (pas de mini-panel) |
| D-015-VF | `--accept-data-loss` hors démo jetable = opt-in explicite uniquement |

## Encore ouvertes (validation humaine)

| ID | Question | Options | Recommandation | Validateur |
|----|----------|---------|----------------|------------|
| D-006 | Scoping commercial (SEC-009) | Global · Scoped | Produit | Vous |
| D-007 | Overrides `/admin/permissions` → `hasPermission` API ? | Oui / Non | Avant Lot permissions DB | Vous |
| D-008 | Rotation NEXTAUTH_SECRET si fallback a servi | Oui / N/A | Oui si doute prod | Vous |
| D-009 | Fournir backup PG + PDF V17 dans `docs/references/` ? | Oui / Plus tard | Bloque GO PROD | Vous |
| D-010 | Autoriser Hostinger **staging** (DB séparée) ? | Oui / Non | Après build:hostinger | Vous |
| D-012 | Autoriser `repairPaymentDrift` sur `CMD-2024-013` ? | Phrase + backup / Non | Phrase : « autorise repair payment drift » | Vous |
