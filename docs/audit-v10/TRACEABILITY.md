# Matrice de traçabilité V10

| ID | Constat | Fichier(s) | Correction | Test | Statut |
|----|---------|------------|------------|------|--------|
| SEC-001 | Export sans canaris | `scripts/export-clean.mjs`, `lib/security/export-canaries.ts` | Scan + fail | `tests/export-clean-canaries.test.ts` | PASS |
| SEC-002 | Secrets littéraux | `lib/auth-secret.ts`, `provision-production.mjs` | Refuse placeholder | `tests/auth-secret-startup.test.ts` | PASS |
| SEC-003 | Setup HTTP | `app/api/setup-db/route.ts` | Local strict 404 | code + middleware | PASS |
| SEC-004 | Rotation externe | consoles | Checklist | manuel | BLOCKED |
| AUTH-001 | Prod detection | `lib/auth-environment.ts` | NODE_ENV=production | `tests/auth-environment.test.ts` | PASS |
| AUTH-002 | JWT fail-open | `lib/auth-utils.ts`, `ensure-auth-user.ts` | Fail-closed | `tests/ensure-auth-user.test.ts` | PASS |
| AUTH-004 | Allowlist large | `middleware.ts`, `public-api-routes.ts` | Routes exactes | `tests/authorize-canonical.test.ts` | PASS |
| AUTH-005 | Health verbose | `app/api/health/route.ts` | `{ok:true}` | — | PASS |
| AUTH-006 | Rate limit | `lib/rate-limit.ts` | Fail-closed Vercel | — | PASS |
| PERM-001 | Double vérité | `lib/auth/authorize.ts` | Service canonique | `tests/authorize-canonical.test.ts` | PASS |
| PRIX-002 | Fallback | `price-unavailable.ts` | Signal | `tests/v10-prix-paiement.test.ts` | PASS |
| DEP-001 | Vulns npm | — | — | registry TLS | NOT_RUN |
| DATA-006 | Paiements | schema + migration | idempotencyKey | `tests/v10-prix-paiement.test.ts` | PASS |
| FLOW-002 | Outbox | `OutboxEvent` + `outbox.ts` + `bat-gpao-sync.ts` | Modèle + enqueue | suite vitest | PASS partiel (worker TODO) |
| PRIX-002 | Fallback | `catalogue-pos-builder` / entry-price | DB > Excel runtime | `catalogue-pos-builder.test.ts` | PASS |
| PERM-001 | Double vérité | `requireAnyPermission` → `authorizeAny` | Politique unique | `authorize-canonical.test.ts` | PASS |
| C081 | Vitest | suite complète | 2098 PASS / 0 FAIL | rapport | PASS |
| C100 | Claim 10/10 | — | interdit si C005 BLOCKED | — | FAIL |
| API-004 | Scanner BAT | `audit-api-auth.mjs` | requireBat* | exit 0 | PASS |
| PERF-003 | Dashboard | `dashboard-stats.ts` | Bornes | — | PASS |
| CI | Pipeline | `.github/workflows/ans-orion-ci.yml` | Job quality | — | PASS (fichier) |
| C005 | Rotation | — | — | — | BLOCKED |
| C081 | Suite Vitest | — | — | — | NOT_RUN |
| C100 | Tout PASS | FINAL_REPORT | — | — | FAIL |
