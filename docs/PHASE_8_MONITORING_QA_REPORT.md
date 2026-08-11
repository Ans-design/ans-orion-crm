# Phase 8 — Monitoring / QA / Sentry

**Date :** 2026-06-24  
**Statut :** Intégré  
**Dépendance ajoutée :** `@sentry/nextjs@^8` (optionnelle via DSN)

---

## Objectif

Observabilité production-ready sans casser le dev local : Sentry opt-in, sonde readiness, smoke E2E modules critiques.

---

## Sentry (opt-in)

| Fichier | Rôle |
|---------|------|
| `lib/monitoring/sentry-config.ts` | DSN, environment, sample rate |
| `lib/monitoring/sentry-server.ts` | Init serveur + `captureServerException` |
| `lib/monitoring/sentry-client.ts` | Init client + `captureClientException` |
| `components/monitoring/sentry-init.tsx` | Monté dans `app/providers.tsx` |
| `instrumentation.ts` | `initSentryServer()` au boot Node |

**Activation :** définir `SENTRY_DSN` et/ou `NEXT_PUBLIC_SENTRY_DSN` (voir `.env.example`).  
Sans DSN → aucun envoi, zéro impact build/dev.

**Captures automatiques :**
- `OrionErrorBoundary` → erreurs React client
- `logger.apiError` → erreurs API serveur

---

## Health / readiness

| Endpoint | Usage |
|----------|--------|
| `GET /api/health` | Liveness (sans Prisma) |
| `GET /api/health/db` | Connexion DB |
| `GET /api/health/ready` | **Readiness** — env + DB + sentry status |

`lib/monitoring/ready-probe.ts` — logique partagée, réutilisable en CI.

Réponse : `{ ok, data: { checks, timestamp, runtime, version } }` — HTTP 503 si env ou DB KO.

---

## QA E2E

Nouveau spec **`e2e/smoke-orion.spec.ts`** :
- Login admin
- Smoke 7 modules : dashboard, clients, POS, panier, devis, commandes, stock
- Vérifie `/api/health/ready`

```bash
npm run test:e2e:smoke
```

CI existante : `quality` (typecheck + lint + vitest) + `e2e` (Playwright complet) + `build`.

---

## Tests unitaires

- `tests/monitoring.test.ts` — `probeReadiness`, `/api/health/ready`, config Sentry
- Suite complète : **968 tests**

---

## Vérifications

```bash
npm run typecheck
npm run test
npm run test:e2e:smoke   # nécessite Playwright + serveur E2E
```

---

## Prochaine étape — Phase 9

Performance / recherche PostgreSQL / optimisations.
