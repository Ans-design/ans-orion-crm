# ANS ORION — Sécurité (Lot 8)

## Production Hostinger (durci par défaut)

| Fonctionnalité | Prod | Override env |
|----------------|------|--------------|
| Cartes démo / quick login | Off | `ALLOW_QUICK_LOGIN=true` |
| Inscription publique | Off | `ALLOW_PUBLIC_SIGNUP=true` |
| Auth matricule v29 embarquée | Off | `ALLOW_V29_AUTH=true` |
| Comptes dev / DEMO_MODE | Off | `DEMO_MODE=true` (dev only) |

Config appliquée via `lib/bundled-production-env.ts` + `lib/auth-environment.ts`.

## Rate limiting

- Middleware : POST `/api/auth/*` (40/min/IP), callback (20/min)
- Login guard : 5 échecs → verrou 15 min (`lib/login-guard.ts`)
- Forgot password, access-request : Upstash si configuré

## En-têtes HTTP

`lib/security-headers.ts` — appliqués sur toutes les réponses (middleware).

### CSP Report-Only (Lot 8 — étape sûre)

- Header : **`Content-Security-Policy-Report-Only`** (pas `Content-Security-Policy` enforce)
- Directives : `default-src 'self'` ; `script-src` avec `'unsafe-inline' 'unsafe-eval'` (requis Next.js 14 hydration / HMR) ; `style-src 'unsafe-inline'` ; `img-src` data/blob/https ; `connect-src` https + wss (APIs / ANS Talk) ; `frame-ancestors` / `base-uri` / `form-action` `'self'`
- Enforce strict **toujours en attente** : validation POS / cartes / embeds avant bascule

## Cron

Routes `/api/cron/*` : `Authorization: Bearer $CRON_SECRET` + rate limit middleware.

## Reste

- 2FA optionnel (TOTP)
- Permissions granulaires étendues
- CSP **enforce** stricte (après validation POS / cartes ; Report-Only déjà en place)
