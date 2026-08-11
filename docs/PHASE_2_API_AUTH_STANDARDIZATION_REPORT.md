# Phase 2 — Standardisation API / Auth / Erreurs (ANS ORION)

**Date :** 24 juin 2026  
**Projet :** ANS CRM V3 / ANS ORION  
**Précédent :** [PHASE_1_P0_STABILIZATION_REPORT.md](./PHASE_1_P0_STABILIZATION_REPORT.md)

---

## Résumé

Mise en place d'une couche HTTP réutilisable (`ok` / erreurs typées / auth centralisée) et migration des APIs prioritaires vers l'enveloppe standard `{ ok, data, meta }`. Les clients consommateurs ont été adaptés via `lib/api-client.ts` (compatible legacy).

**Résultat :** typecheck **OK**, build **OK**, **956** tests **OK**.

---

## 1. Infrastructure créée / consolidée

| Fichier | Rôle |
|---------|------|
| `lib/server/http/api-response.ts` | Déjà présent — `ok`, `created`, `badRequest`, `unauthorized`, `forbidden`, `notFound`, `serverError`, `fromError` |
| `lib/server/http/api-error.ts` | **Nouveau** — point d'entrée `ApiError` |
| `lib/server/http/errors.ts` | Classes d'erreur typées (inchangé) |
| `lib/server/auth/with-auth-api.ts` | **Nouveau** — auth + try/catch + conversion 401/403 standard |
| `lib/server/logger/logger.ts` | Enrichi — support `requestId` |
| `lib/server/validation/common.ts` | **Nouveau** — schémas Zod + `parseBody` → `badRequest` structuré |
| `lib/api-client.ts` | **Nouveau** — `unwrapApiData`, `getApiErrorMessage`, `readApiJson` |
| `lib/api-guard.ts` | Erreurs `{ ok: false, error: { message, code } }` homogènes |

### Format succès

```json
{ "ok": true, "data": { }, "meta": { } }
```

### Format erreur

```json
{ "ok": false, "error": { "message": "…", "code": "ERROR_CODE", "details": { } } }
```

### `withAuthApi`

Options : `permission`, `admin`, `adminOrManager`, `messaging`, `messagingWrite`, `fallbackResponse`, `requestId` (header `x-request-id` / `x-vercel-id`).

---

## 2. Routes migrées (priorité Phase 2)

| Route | Changement |
|-------|------------|
| `GET /api/dashboard/*` | `createDashboardSliceRoute` → `withAuthApi` + `ok(data)` ; dégradé via `ok({ …_warning })` |
| `GET/PUT/DELETE/POST /api/cart` | `withAuthApi` + enveloppe `ok` ; erreurs métier → `ApiError.badRequest` |
| `GET /api/messaging/unread` | `ok({ unreadCount })` |
| `GET/POST /api/messaging/conversations` | `ok` / `created` |
| `GET /api/messaging/users` | `ok(users)` |
| `GET/POST /api/rh/late-arrival` | `ok(gate)` / `ok(result)` |
| `GET /api/alerts/ticker` | `ok({ alertes, updatedAt })` |
| `GET /api/admin/permissions?effective=1` | `ok({ moduleAccess, access })` dégradé |
| `GET /api/admin/permissions?stats=1` | `ok(stats)` dégradé |

Les routes non migrées conservent `{ error: string }` legacy — migration progressive en Phase 2+.

---

## 3. Clients mis à jour

| Composant | Adaptation |
|-----------|------------|
| `app/(app)/dashboard/page.tsx` | `unwrapApiData` sur les slices |
| `hooks/use-cart.ts` | `unwrapApiData` + `getApiErrorMessage` |
| `lib/hooks/use-ans-talk.tsx` | conversations, unread, users |
| `components/layout/alert-ticker.tsx` | `unwrapApiData` alertes |
| `components/layout/orion-sidebar.tsx` | permissions effectives |
| `components/auth/late-arrival-gate.tsx` | gate RH |

`unwrapApiData` accepte **enveloppe standard** et **corps plat legacy** — pas de rupture sur endpoints non migrés.

---

## 4. Tests ajoutés

| Fichier | Couverture |
|---------|------------|
| `tests/api-client.test.ts` | unwrap + messages d'erreur |
| `tests/api-guard.test.ts` | mis à jour (error.message) |
| `tests/server-api-response.test.ts` | existant — inchangé |

---

## 5. Commandes de validation

```powershell
cd "C:\Users\ans\Documents\ANS CRM V3"
npm run typecheck          # OK
npx prisma validate        # OK
npx prisma generate        # OK
npm run test               # 956/956 OK
npm run build              # OK
```

---

## 6. Critères Phase 2

| Critère | Statut |
|---------|--------|
| Réponses API cohérentes (routes prioritaires) | **OK** |
| Erreurs contrôlées (plus de string brute dans api-guard) | **OK** |
| Pas d'exposition Prisma brute côté client (safeErrorMessage + fallbacks) | **OK** |
| Auth centralisée (`withAuthApi`) | **OK** |
| Build OK | **OK** |
| Rapport Phase 2 | **OK** |

---

## 7. Risques résiduels / suite

| Priorité | Sujet |
|----------|-------|
| P1 | Migrer les ~200 autres route handlers vers `withAuthApi` + `ok` |
| P1 | Déprécier `lib/api-response.ts` (`apiError` legacy) progressivement |
| P1 | Repository Prisma centralisé (Phase 3) |
| P2 | Format `{ ok, data }` sur POST admin/permissions (mutations) |

---

## 8. Suite recommandée

**Phase 3 — Prisma / Database / PostgreSQL / Migrations**  
Audit `schema.prisma`, alignement SQLite local / PostgreSQL prod, scripts migration documentés.

---

**Phase 2 : VALIDÉE** — prêt pour **Phase 3**.
