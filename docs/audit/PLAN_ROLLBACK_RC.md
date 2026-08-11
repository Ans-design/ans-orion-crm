# Plan rollback RC — ANS ORION

| Date | 2026-07-19 |
|------|------------|
| Contexte | Copie sans Git · NO-GO PROD |

## Code

| Situation | Action |
|-----------|--------|
| Régression locale après lot VF | Restaurer fichiers modifiés depuis sauvegarde workspace / ZIP parent |
| Déploiement staging raté | Redeploy artefact précédent (Hostinger/Vercel) |
| Git absent | **Pas d’empreinte** — prioriser init Git officiel (D-001 à lever) avant prod |

## Données

| Situation | Action |
|-----------|--------|
| Pas de dump PG | **Rollback données impossible** |
| Dump disponible | Restore sur instance → bascule DNS/URL seulement après vérifs |
| Payment drift | Ne pas « corriger à la main » ; dry-run `repairPaymentDrift` après backup |

## Flags dangereux (ne pas activer en prod)

- `ALLOW_VERCEL_DB_PUSH_DATA_LOSS`
- `ALLOW_PROD_DB_SETUP`
- `ALLOW_NEON_DB_PUSH`
- `ALLOW_SETUP_DB`
- `ALLOW_HOSTINGER_DEPLOY` (sauf procédure validée)

## Critère de sortie rollback

Service accessible + health DB OK + aucun drift critique nouveau + sign-off technique.
