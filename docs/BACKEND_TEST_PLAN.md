# Plan de tests backend — ANS ORION

> **Date :** juin 2026

---

## Commandes cibles

```bash
npm run typecheck
npm run test
npx prisma validate
npx prisma generate
npm run build
npm run audit:vercel    # nécessite .env.audit.local
```

---

## Couverture actuelle

| Type | Outil | Volume |
|------|-------|--------|
| Unit / intégration | Vitest | **909+** tests |
| E2E accès pages | Playwright `e2e/page-access.spec.ts` | ~7 scénarios |
| Audit Vercel auth | `scripts/audit-vercel-auth.mjs` | 33 pages |
| POS complétude | `tests/pos-completeness-audit.test.ts` | 5 tests |
| API response | `tests/server-api-response.test.ts` | 3 tests |

---

## Tests prioritaires (manuel + auto)

| # | Module | Auto | Manuel |
|---|--------|------|--------|
| 1 | Login | `tests/login-check-fail-closed.test.ts` | `/login` |
| 2 | Dashboard | `tests/dashboard-fallback.test.ts` | widgets + `/api/dashboard/*` |
| 3 | Clients | `tests/page-access.test.ts` | CRUD client |
| 4 | POS | `tests/pos-completeness-audit.test.ts` | configurateur + récap |
| 5 | Panier | `tests/cart-*.test.ts` | checkout |
| 6 | Devis | `tests/devis-validity.test.ts` | création depuis panier |
| 7 | Paiement | — | montant > 0, ref Mobile Money |
| 8 | Commande | `tests/commande-workflow.test.ts` | fiche 360° |
| 9 | Messagerie | `tests/ans-talk.test.ts` | unread, conversations |
| 10 | Backoffice | `tests/backoffice-article-crud.test.ts` | publish config |
| 11 | Finance | `tests/finance-gpao.test.ts` | paiements → dashboard |
| 12 | RH | `tests/rh.test.ts` | late-arrival |

---

## Audit Vercel — améliorations

1. Re-tester redirects legacy après déploiement.
2. Attendre stabilisation session avant appels API dashboard.
3. Capturer `/api/health/system` dans le rapport.
4. Comparer erreurs API avant/après refactor.

---

## Tests à ajouter (vague 5)

- [ ] `clients.service` avec repository mocké
- [ ] Validation Zod paiements (montant, référence)
- [ ] `runApiHandler` + `ApiError` propagation
- [ ] Permissions par rôle sur routes critiques

---

## Critères de succès

- `npm run test` vert
- `npm run build` vert
- Audit Vercel : 0 route legacy 404, APIs critiques sans 500
- Nouvelles routes utilisent `{ ok, data }` ou migration documentée
