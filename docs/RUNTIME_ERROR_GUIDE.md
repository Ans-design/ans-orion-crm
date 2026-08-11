# Guide erreurs runtime — ANS ORION

> Où regarder quand quelque chose casse en local ou sur Vercel.

---

## Diagnostic rapide

| Symptôme | Première action |
|----------|-----------------|
| Page blanche / 500 | Logs Vercel ou terminal `npm run dev:local` |
| API 401 | Session expirée — reconnecter ; vérifier `credentials: 'include'` |
| API 403 | Rôle sans permission — `lib/auth/permissions.ts` |
| API 500 | Logs serveur + `safeErrorMessage` (pas de stack en prod) |
| Prisma error P2002/P2003 | Contrainte unique / FK — données ou session |
| SQLite readonly | Fermer autre processus sur `demo.db` |
| Chunks 404 local | `npm run dev:local:clean` |

---

## Pages de diagnostic

| URL | Contenu |
|-----|---------|
| `/dev-health` | Prisma, NEXTAUTH, DATABASE_URL, Tailwind |
| `/api/health` | Ping app |
| `/api/health/db` | Ping DB |
| `/api/health/system` | Checks agrégés JSON |
| `/administration/vue-ensemble` | Admin overview (si accès) |

---

## Logs

### Local
- Terminal Next.js : erreurs `[route-label]` via `api-guard` + `logger` JSON.

### Vercel
- Dashboard Vercel → Functions → logs par route
- Filtrer `prisma:`, `AUTH_ERROR`, `VALIDATION_ERROR`

### Format logger (nouveau)
```json
{"ts":"...","level":"error","message":"clients GET","route":"clients GET","error":{"name":"Error","message":"..."}}
```

---

## Erreurs Prisma courantes

| Code | Signification | Action |
|------|---------------|--------|
| P2002 | Unique constraint | Doublon email/code client |
| P2003 | Foreign key | ID client/commande invalide |
| P2025 | Record not found | ID obsolète |
| SQLITE_READONLY | DB verrouillée | Redémarrer dev, pas de double instance |

---

## Auth / session

1. Vérifier `NEXTAUTH_SECRET` (≥ 32 caractères).
2. Vérifier `NEXTAUTH_URL` (local : `http://127.0.0.1:3020`).
3. `ensureUserInDb` — utilisateur JWT doit exister en base.
4. Audit 401 dashboard : souvent **race condition** audit Playwright, pas bug métier.

---

## APIs messagerie / RH

| Route | Service | Auth |
|-------|---------|------|
| `/api/messaging/unread` | `messaging-service` | `requireMessagingAuth` |
| `/api/rh/late-arrival` | `late-arrival-service` | `requireAuth` + matricule |

Si 500 : lire `lib/services/late-arrival-service.ts` et tables RH associées.

---

## Fichiers de référence

- `lib/api-guard.ts` — catch global routes
- `lib/api-response.ts` — `safeErrorMessage`
- `lib/server/http/errors.ts` — `ApiError` typées
- `lib/server/logger/logger.ts` — logs structurés
- `docs/VERCEL_AUTH_AUDIT.md` — erreurs prod connues

---

## Relance propre local

```bash
npm run dev:local:clean
# → http://127.0.0.1:3020
# Hard refresh Ctrl+Shift+R
```
