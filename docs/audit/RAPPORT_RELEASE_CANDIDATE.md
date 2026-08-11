# Rapport Release Candidate — Vague 2 / Vague Finale

| Date | 2026-07-19 |
|------|------------|
| Empreinte | Copie locale **sans Git** |
| Verdict | **GO STAGING** possible · **NO-GO PRODUCTION** |

## Synthèse

### Fermé (Vague 1+2 + A→F + Vague Finale)

- Auth middleware `/api`, secret fail-closed, démo restreinte
- Golden pricing + canon `calculatePrice` + fiscal HT/TTC
- Stock idempotence + TX adjust + anti-oversell + réception achat atomique
- **D-011** : consommation stock sur **Prête / Livré** + release **Annulée**
- Finance : Accepté PUT bloqué, paiement ref, ledger gates BAT/workflow
- Hostinger : build sans data-loss par défaut ; setup-db fail-closed
- **VF-P0A** : `vercel-build` refuse `--accept-data-loss` sans `ALLOW_VERCEL_DB_PUSH_DATA_LOSS=true`
- **VF-P0B** : `getPosCatalogue` lecture pure ; merges via `runPosCatalogueMaintenance` (sync explicite)
- **VF-QA01** : preuves comportementales fiscal/stock/virtualisation/erreurs API
- **VF-P1** : radius design system **7px** ; profil nav `finance` ; docs sync/ledger
- RC Auth/RBAC : **387 routes** ; tests automatisés
- `npx next build` local **OK** (2026-07-19)

### Ouvert / bloquant prod

| # | Anomalie | Gravité | Statut |
|---|----------|---------|--------|
| 1 | Backup PG métier **MANQUANT** | P0 | Bloque GO PROD + repair |
| 2 | Drift schema sqlite / postgres | P0 | Mitigé patch build |
| 3 | Formules custom perdues | P0 data | Sans backup |
| 4 | Payment drift `CMD-2024-013` | P0 | Detecté RO — repair **D-012** |
| 5 | PDF V17 A–Z manquant | P1 | Absents `docs/references/` |
| 6 | `build:hostinger` + E2E staging | P1 | NON EXÉCUTÉ |
| 7 | Recette manuelle POS/caisse/sync | P1 | Partielle |
| 8 | Secrets `deploy/hostinger/*` | P1 | Vérif humaine hors logs |
| 9 | Concurrence DB réelle (double TX) | P1 | Non prouvée en intégration |

## Migrations

**Aucune appliquée** cette vague (interdit sans backup).

## Déploiement Hostinger

Voir `PLAN_DEPLOIEMENT_HOSTINGER_RC.md`. Guard local actif.

## Rollback

- Code : artefact précédent (quand Git dispo)
- Données : **impossible sans dump**

## Verdict

| Niveau | |
|--------|--|
| Développement local | **GO** |
| Staging (DB séparée) | **GO STAGING** après `build:hostinger` + healthcheck |
| Production Hostinger | **NO-GO** jusqu’à backup + validation |

## Prochaines actions propriétaire

1. Backup PG + phrase `autorise repair payment drift` (D-012)
2. D-010 staging Hostinger
3. PDF V17 A–Z dans `docs/references/`
4. Checklist manuelle restante + sign-off
