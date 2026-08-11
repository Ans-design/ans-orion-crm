# AUDIT 360 — Phase 2 : Code / Qualité / Sécurité / Performance

Date : 2026-07-04  
Références : `docs/AUDIT_CODEBASE.md`, `docs/BACKEND_ARCHITECTURE_AUDIT.md`, `docs/RUNTIME_ERROR_AUDIT.md`

---

## Architecture Next.js

| Aspect | État | Note |
|--------|------|------|
| App Router | ✅ Mature | 85 pages, layouts `(app)` |
| API routes | ⚠️ Dispersées | 224 routes, ~40% Prisma direct |
| Services | ⚠️ Dual layer | `lib/services/` + `lib/server/modules/` |
| Middleware | ✅ OK | Redirects legacy, page ACL, rate limit auth |
| API auth | ⚠️ Par route | Pas de guard JWT middleware global |

---

## Erreurs critiques

Aucune erreur build/typecheck au 2026-07-04.

---

## Dette technique

| ID | Priorité | Item |
|----|----------|------|
| DT1 | P1 | Façade unifiée pricing/sync |
| DT2 | P1 | Standardiser enveloppe JSON erreur API |
| DT3 | P2 | Réduire fichiers >800 lignes (`config-types.ts`, POS page) |
| DT4 | P2 | Dead code / modules hidden legacy |
| DT5 | P3 | Storybook composants Orion |

---

## Risques sécurité

| Risque | Priorité | Mitigation |
|--------|----------|------------|
| API sans validation Zod | P1 | Étendre `parseBody` + schemas (`lib/validators/`) |
| RBAC API inégal | P1 | Audit `requirePermission` sur 224 routes |
| Rate limit partiel | P2 | Étendre au-delà auth/cron |
| Secrets .env | P0 | Ne jamais committer — OK |
| Session JWT | P1 | Cookie secure, rotation NextAuth |
| Upload fichiers | P1 | Valider MIME/taille messaging + BAT |

---

## API fragiles (échantillon P1)

- Routes Prisma direct sans try/catch uniforme
- Messaging polling fréquent — risque 401/500 (`VERCEL_AUTH_AUDIT.md`)
- RH `late-arrival` fail-open serveur

---

## Performance

| Zone | Risque | Action |
|------|--------|--------|
| POS `[id]/page.tsx` | Bundle lourd | Lazy-load configurateurs |
| Dashboard charts | Recharts | Lazy + pagination |
| Catalogue seed | 95+ produits | Cache API `/api/pos/catalogue` |
| ANS Talk | Polling | WebSocket/SSE futur P3 |
| `config-types.ts` | Parse startup | Split par famille |

---

## Tests

| Type | Volume | Gap |
|------|--------|-----|
| Vitest | ~991 | E2E RH/finance incomplet |
| Playwright | smoke + modules | GPAO complet P2 |
| Postman | Absent | Créer collection OpenAPI P2 |

---

## Priorités P0–P3

**P0 :** Aucun build/auth/paiement cassé  
**P1 :** Validation API, RBAC, services paiement/pricing  
**P2 :** ESLint hooks, bundle POS, Lighthouse  
**P3 :** Datadog/Sentry dashboards, load tests

---

## Commandes recommandées

```bash
npm run typecheck
npm run test
npm run test:e2e:smoke
npm run analyze
npm run audit:vercel
```
