# Décisions propriétaire — Vague 2

| Date | 2026-07-18 |
|------|------------|

## Décisions actives (non effacées)

| ID | Décision | Source |
|----|----------|--------|
| D-001 | Pas de `git init` / commit / push | Propriétaire 2026-07-18 |
| D-002 | Cible long terme **PostgreSQL partout** ; SQLite lecture seule temporaire ; **pas** de changement provider ni migration maintenant | Propriétaire |
| D-003 | Aucune sauvegarde métier vérifiable trouvée | Inventaire lecture seule |
| D-004 | Pas de seed / backfill / repair tant qu’il n’y a pas de backup restaurable | Propriétaire |
| D-005 | **Hostinger = production principale** ; Vercel+Neon = preview/staging séparés ; pas de double écriture sur la même DB | Prompt Vague 2 + propriétaire |
| D-006 | Auth/permissions : code + tests OK ; pas de mutation rôles/users réels | Propriétaire |
| D-007 | Vague 2 lancée (prompts standard + enrichi V17) — corriger à partir Hostinger | Chat 2026-07-18 |
| D-008-V2 | Prompt (3) enrichi V17 — V2-02R sans PDF ; C01–C06 bloqués validation ; release stock sur Annulée | Prompt (3) + session |
| D-011 | Consommation stock à fin production **activée** (`consumeReservationsForCommande`) | Chat « oui » 2026-07-18 |
| D-013-VF | Radius design system **7px** | Règle maître + Vague Finale |
| D-014-VF | ANS Talk badge → `/messagerie` (pas mini-panel) | Vague E / Finale |
| D-015-VF | `--accept-data-loss` hors démo = opt-in explicite | Vague Finale P0A |

## V17

| Point | Statut |
|-------|--------|
| PDF `ANS_Design_Print_Referentiel_AZ_V17_Complet_Enrichi.pdf` | **MANQUANT** dans Cursor |
| PDF `Audit_Complet_Referentiel_ANS_V17.pdf` | **MANQUANT** |
| Règles C01–C06 (sanctions auto, paie horaires, HSE « conforme », etc.) | **Ne pas coder aveuglément** — validation métier/juridique |

## Déploiement

| Question | Réponse actuelle |
|----------|------------------|
| Déployer Hostinger maintenant ? | **Non** tant que backup + `ALLOW_HOSTINGER_DEPLOY` + validation |
| GO PRODUCTION | **Interdit** sans backup restaurable |
| GO STAGING | Possible après typecheck/build/tests essentiels + env séparée |

## Historique

Les décisions antérieures restent valides sauf nouvelle entrée datée ici.
