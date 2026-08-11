# 10 — Bugs, Risques & Dette Technique

## Bugs corrigés (Vague 1)

| Bug | Cause | Fix |
|---|---|---|
| EPERM prisma generate | Node lock DLL | Clean + taskkill |
| Chunks 404 / HTML brut | `.next` corrompu | `dev-clean.mjs` |
| publish-bulk test 500 | Mock manquant matières | `admin-backoffice-api.test.ts` |
| baseMaterial findMany undefined | Delegate Prisma | `base-material.repository` |
| Import serveur dans client stock modal | `stockStatus` | `stockStatusClient` |

## Risques ouverts

### P0 — Aucun bloquant build/runtime

### P1

| Risque | Impact | Mitigation |
|---|---|---|
| Double couche `lib/services` + modules | Drift logique | Migration progressive + tests sync |
| Grilles tariffaires SF/PLV actives | Prix hors backoffice | Migration vers BasePrintingPrice |
| 89 routes admin redondantes | Confusion API | Documentation + dépréciation |
| Windows EPERM récurrent | Dev bloqué | Doc BUILD report |

### P2

| Risque | Impact |
|---|---|
| 26 sections admin | UX labyrinthe |
| Pas d'OpenAPI | Intégration difficile |
| Virtualisation tables partielle | Perf 95×N variables |
| Secrets `.env` | Sécurité — `.gitignore` OK |

### P3

| Risque | Impact |
|---|---|
| Prisma 7 config deprecation | Migration `prisma.config.ts` |
| npm `devdir` warning | Cosmétique |

## Dette technique quantifiée

| Zone | Fichiers legacy | Action |
|---|---:|---|
| `lib/services/` | ~80 | Fusionner dans modules |
| `app/api/admin/` | 20 | Alias → admin-backoffice |
| `components/admin/` | ~15 | Masquer → backoffice-v2 |
| Docs audit dupliqués | 200+ md | Index `audit-10-10` |

## Sécurité (Phase 9 preview)

- Auth NextAuth ✅ `middleware.ts`
- Permissions `lib/auth/permissions.ts` ✅
- API JSON erreurs ✅ majorité routes v2
- **À renforcer :** audit log UI, justification prix forcé

## Observabilité

- Sentry : non intégré (P3)
- `docs/PHASE_8_MONITORING_QA_REPORT.md` existant
- Logs console `[stock]`, `[admin-backoffice]` — à centraliser
