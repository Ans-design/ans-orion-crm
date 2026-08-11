# Rate-limit distribué — SEC-RL

## Abstraction

| Couche | Fichier | Rôle |
|--------|---------|------|
| Politiques | `lib/rate-limit-policy.ts` | clé, fenêtre, limite, criticité |
| Mémoire | `lib/rate-limit.ts` (`checkRateLimit`) | **local / démo uniquement** |
| Redis | `lib/rate-limit-upstash.ts` | Upstash REST (`UPSTASH_REDIS_REST_URL` + `TOKEN`) |
| Enforce | `enforceRateLimit` / `enforcePolicy` | Upstash → sinon fail-closed si critique |

## Couverture (middleware + routes)

| Opération | Préfixe clé | Fenêtre | Limite | Critique |
|-----------|-------------|---------|--------|----------|
| Login callback | `auth:{ip}` | 60s | 20 | oui |
| Auth sensible | `auth-sensitive:{ip}:{path}` | 60s | 30 | oui |
| Signup | `signup:{ip}` | 60s | 5 | oui |
| Forgot / reset | `forgot` / `reset` (routes) | 60s | 5 / 10 | oui |
| Upload | `upload:{uid}:{ip}` | 60s | 30 | oui |
| Paiement | `payment:{uid}` | 60s | 40 | oui |
| Publication tarif | `pricing-publish:{uid}` | 60s | 10 | oui |
| Cron | `cron:{ip}` | 60s | 10 | oui (+ secret) |
| Liens BAT | `bat-client:{ip}` | 60s | 10 | oui |
| Public info | `public-info:{ip}` | 60s | 60 | non |

## Multi-instance

`requiresDistributedRateLimitStore()` : Vercel, Hostinger, `APP_ENV=production|staging`, ou `RATE_LIMIT_REQUIRE_DISTRIBUTED=true`.

## Indisponibilité store

- **Critique** sans Upstash → **429 fail-closed** (sauf `ALLOW_MEMORY_RATE_LIMIT=true` local).
- Non critique → mémoire locale.

## HTTP

- Status **429**
- Header **`Retry-After`**
- Journal : préfixe de clé uniquement (pas d’IP complète ni email dans les logs applicatifs)
