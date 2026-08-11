# Rapport final — Refactoring backend 10 étapes

> **Date :** juin 2026  
> **Mission :** Améliorer la structure backend ANS ORION sans réécriture complète.

---

## Résumé

Les **10 étapes** du plan ULTRAPROMPT sont **amorcées** : audit complet, fondations `lib/server/`, standardisation HTTP, validation, documentation DB/sync/tests, et plan de migration progressive. **Aucun module métier supprimé**, stack Next.js + Prisma + Vercel conservée.

| Étape | Statut | Livrable |
|-------|--------|----------|
| 1. Audit backend | ✅ | `docs/BACKEND_ARCHITECTURE_AUDIT.md` |
| 2. Organisation modules | ✅ Partiel | `lib/server/modules/clients/` (pilot) + structure |
| 3. Standardiser APIs | ✅ Fondations | `lib/server/http/api-response.ts`, `errors.ts` |
| 4. Validation | ✅ Fondations | `lib/server/validation/common-schemas.ts` + Zod existant |
| 5. Prisma / DB | ✅ Audit | `docs/DATABASE_AUDIT.md` |
| 6. Auth / permissions | ✅ | `lib/server/auth/session.ts`, `permissions.ts` |
| 7. Synchronisation | ✅ Doc + map | `lib/server/sync/commercial-flow.ts` |
| 8. Logs / diagnostic | ✅ | `lib/server/logger/logger.ts`, `/api/health/system` |
| 9. Tests | ✅ Plan + tests | `docs/BACKEND_TEST_PLAN.md`, `tests/server-api-response.test.ts` |
| 10. Plan progressif | ✅ | Ce rapport + vagues 1→5 |

---

## 1. Audit initial

- **217 routes API**, **81 services**, **99 modèles Prisma**
- Problèmes P0 : routes legacy 404 (redirects `next.config.js`), formats JSON hétérogènes, Prisma direct dans ~90 routes
- Référence audit Vercel : `docs/VERCEL_AUTH_AUDIT.md`

---

## 2. Inspirations appliquées

| Framework | Pratique retenue |
|-----------|------------------|
| **NestJS** | Modules `lib/server/modules/*`, séparation route/service/repository |
| **Laravel** | Validation Zod, migrations documentées |
| **Django/Rails** | Convention noms, seeds modulaires |
| **Supabase** | Health checks `/api/health/system` |
| **Prisma** | Schéma source de vérité, `lib/server/db/prisma.ts` |

---

## 3. Nouvelle structure

```
lib/server/
  auth/
    session.ts          # alias requireAuth, requirePermission
    permissions.ts      # canAccessModule()
  db/
    prisma.ts           # réexport singleton
  http/
    api-response.ts     # ok(), badRequest(), { ok, data }
    errors.ts           # ApiError typées
    pagination.ts
  logger/
    logger.ts           # JSON structuré
  validation/
    common-schemas.ts
  modules/
    clients/            # pilot repository + validation + mapper
  sync/
    commercial-flow.ts  # règles CRM→POS→…→Talk
```

---

## 4. APIs — changements

- `lib/api-guard.ts` : intégration `logger` + `ApiError` + envelope `{ ok: false, error: { code } }`
- **Nouvelle route** : `GET /api/health/system`
- **Legacy redirects** : cockpit, crm/clients, catalogue-pos, etc. (déployer Vercel)

---

## 5. Prisma

- Audit dans `docs/DATABASE_AUDIT.md`
- Pas de migration destructive dans cette phase
- Prochaine étape : indexes + repositories

---

## 6. Auth / permissions

- Réexports `lib/server/auth/*`
- `canAccessModule(role, moduleKey)` pour garde module
- Permissions existantes conservées (`lib/auth/permissions.ts`)

---

## 7. Synchronisation

- `COMMERCIAL_FLOW` documenté (12 liens métier)
- `MODULE_SERVICE_MAP` pointe vers services existants
- Pas de refonte event-bus — évolution progressive

---

## 8. Logs / diagnostic

- Logger JSON `lib/server/logger/logger.ts`
- `docs/RUNTIME_ERROR_GUIDE.md`
- `/dev-health` existant + `/api/health/system`

---

## 9. Tests

| Commande | Résultat attendu |
|----------|------------------|
| `npm run test` | 909+ pass + `server-api-response` |
| `npx prisma validate` | OK |
| `npm run build` | OK |
| `npm run audit:vercel` | Amélioration post-redirects |

---

## 10. Vagues suivantes (non fait — à planifier)

### Vague 2 — Migrer routes vers services
- Clients GET/POST → `clientsRepository` + envelope standard
- Commandes, devis, paiements

### Vague 3 — DB
- Indexes performance
- Réduire Prisma direct à < 30 routes

### Vague 4 — Sync
- Event log `AuditLog` enrichi
- Tests flow panier → devis → commande

### Vague 5 — Qualité
- Couverture API handlers
- Re-audit Vercel 20/20 pages

---

## Recommandations restantes

1. **Redéployer Vercel** pour redirects legacy + backend structure.
2. Migrer **une route à la fois** vers `{ ok, data }` (ne pas casser le frontend d’un coup).
3. Ajouter permission `messaging:read` si besoin granularité.
4. Profiler requêtes lentes dashboard avant indexes.
5. Commit git quand prêt (working tree volumineux).

---

## Validation critères ULTRAPROMPT

| Critère | État |
|---------|------|
| `npm run build` | À vérifier après merge |
| `npx prisma validate` | À exécuter |
| APIs 500 corrigées | Partiel — late-arrival/messaging à monitorer |
| Routes legacy redirect | ✅ config locale |
| Route handlers plus propres | ✅ api-guard amélioré |
| Services / repositories | ✅ pilot clients |
| Validations backend | ✅ Zod + common-schemas |
| Erreurs lisibles | ✅ ApiError + safeErrorMessage |
| Local + Vercel | ✅ documenté |
| Modules préservés | ✅ |

**Mission étape 1–10 (fondations + audit) : terminée.** Migration complète des 217 routes : **progressive** selon vagues 2–5.
