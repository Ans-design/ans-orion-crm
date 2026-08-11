# ANS ORION V3 — Preuves de tests

**Date :** 2026-07-30

| Commande | Date | Exit | Pass / Fail / Skip | Durée | Résumé |
|----------|------|------|--------------------|-------|--------|
| `npx vitest run` (7 fichiers baseline Phase 0) | 2026-07-30 | 0 | 23 / 0 / 0 | ~959 ms | p0, lot4, catch, nav, stock, pos, database-url |
| `npx vitest run tests/sidebar-admin-access.test.ts` (+nav fusion) | 2026-07-30 | 0 | 26 / 0 / 0 | ~689 ms | gate Admin + flow + 7 macros |
| `npx vitest run` (8 fichiers gates post-fix) | 2026-07-30 | 0 | **37 / 0 / 0** | ~1.0 s | suite + sidebar-admin-access |
| `npm run typecheck` | 2026-07-30 | 0 | — | ~20 s | OK |
| `npm run lint` | 2026-07-30 | 0 | — | — | 0 warning |
| `npm run test:e2e:smoke` | 2026-07-30 | **0** | **16 / 0 / 0** | ~1.8 min | Smoke modules + health OK |
| `npx playwright test e2e/sidebar-admin-gate.spec.ts` | 2026-07-30 | **0** | **6 / 0 / 0** (setup+5) | ~1.7 min | Admin voit Admin ; COM01/démo sans ; URL deny ; flow 1→5 |
| `npm run build` (`NEXT_DIST_DIR=.next-build`) | 2026-07-30 | **0** | — | ~74 s | Production OK (après stop DLL) |
| `npx playwright test e2e/full-business-chain.spec.ts` | 2026-07-30 | **0** | **3 / 0 / 0** (setup+2) | ~2.1 min | Client→devis→CMD→BAT→prod→livraison→facture→paiement + rapports |
| `npx playwright test e2e/sidebar-admin-gate.spec.ts e2e/smoke-orion.spec.ts` | 2026-07-30 | **0** | **21 / 0 / 0** | ~2.5 min | Gate Admin + smoke modules |
| `role-access` V29 OPE01/FIN01/… | — | **bloqué env** | — | — | JSON local n’a que ADM01,CAI01,COM01 |

## Notes

- Aucun `.skip` / `.only` ajouté.
- Tests unitaires `sidebar-admin-access` couvrent deny commercial/production/null et allow admin/manager.
- Helpers E2E commercial : sélection client POS (UI + clé `ans_sales_client_${userId}`), volets flyer, checkout devis, accept API.
