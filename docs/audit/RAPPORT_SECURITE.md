# RAPPORT_SECURITE — Lot 2 Auth / Permissions

| Date | 2026-07-18 |
|------|------------|
| Périmètre | Auth NextAuth, middleware, permissions, démo |
| Mutations données | **Aucune** |

## Findings traités (code)

| ID | Gravité | Correction code | Statut |
|----|---------|-----------------|--------|
| SEC-001 | Critique | Matcher middleware inclut `/api` | Corrigé |
| SEC-002 | Critique | `getNextAuthSecret` refuse fallback en prod Hostinger/Postgres | Corrigé |
| SEC-003 | Élevé | Plus d’auto-démo sur Vercel sans `DEMO_MODE` / `ALLOW_DEMO_LOGIN` | Corrigé |
| SEC-004 | Élevé | Rôle `demo` sans écritures finance/prod ; blocages API étendus | Corrigé |
| SEC-005 | Élevé | `E2E_MODE` ne désactive plus le durcissement Hostinger ; cookies secure | Corrigé |
| SEC-008 | Moyen | Stock : `stock:*` **ou** `production:*` | Corrigé |
| LOCAL_AUTH | Élevé | Désactivé si `USE_PRODUCTION_DB` / Hostinger | Corrigé |

## Findings reportés (pas de mutation données)

| ID | Note |
|----|------|
| SEC-007 | Matrice nav DB ≠ API `hasPermission` — décision produit |
| SEC-009 | IDOR horizontal CRM by design — décision scoping commercial |
| Rotation secrets | Si fallback secret a servi en prod → **validation humaine** |

## Tests exécutés

Voir `CHANGELOG_CORRECTIONS.md` / sortie vitest Lot 2.
