# Plan d'exécution 5/5 — ANS ORION

**Objectif :** porter chaque dimension audit à **5/5**  
**Date démarrage :** 2026-07-05

---

## Score cible vs actuel

| Dimension | Avant | Cible | Statut |
|-----------|-------|-------|--------|
| Architecture | 4.0 | 5.0 | 🔄 |
| Métier imprimerie | 4.2 | 5.0 | 🔄 |
| Sync modules | 3.2 | 5.0 | 🔄 |
| Hub commande | 4.0 | 5.0 | 🔄 |
| UX | 3.5 | 5.0 | 🔄 |
| UI / Design | 3.6 | 5.0 | 🔄 |
| Sécurité | 3.4 | 5.0 | 🔄 |
| Tests & QA | 4.1 | 5.0 | 🔄 |
| Performance | 3.3 | 5.0 | 🔄 |
| RH / Finance Mada | 2.8 | 5.0 | ⚠️ expert local |

---

## Vague 1 — Livré (2026-07-05)

| Item | Fichier / commande |
|------|-------------------|
| ✅ Validation Zod `_pricingSnapshot` | `lib/validators/pricing-snapshot.ts` |
| ✅ Tests snapshot | `tests/pricing-snapshot-validator.test.ts` |
| ✅ Audit auth API CI (265 routes) | `scripts/audit-api-auth.mjs`, `npm run audit:api-auth` |
| ✅ CI drift prix + sync | `.github/workflows/ci.yml` |
| ✅ Rôle `finance` | `lib/auth/permissions.ts` |
| ✅ Handler 401 global | `lib/session-api-fetch.ts` + `lib/fetch-with-timeout.ts` |
| ✅ Onglet Sync backoffice v2 | `AdminBackofficeShell` tab `sync` + `LazySyncCenterPanel` |
| ✅ E2E legacy redirects | `e2e/legacy-redirects.spec.ts` |
| ✅ Redirect sync admin | `lib/administration/backoffice-redirects.ts` |

---

## Vague 2 — Semaine 1 (Architecture + Sync → 5/5)

| # | Action | Dimension |
|---|--------|-----------|
| 1 | Fusion API `backoffice/*` → `admin-backoffice/*` (aliases) | Architecture |
| 2 | Catalogue mode `database-full` 100 % | Sync |
| 3 | `verify:pos-prices` **obligatoire** CI (retirer continue-on-error après seed) | Sync |
| 4 | Split `pos/[id]/page.tsx` → `usePosPricing` + familles lazy | Performance |
| 5 | Virtualisation `commandes` + `stock` (`useWindowedRows`) | Performance |

**Critère 5/5 sync :** 0 alerte critical drift + 95 articles publiés + CI vert.

---

## Vague 3 — Semaine 2 (Sécurité + UX → 5/5)

| # | Action | Dimension |
|---|--------|-----------|
| 6 | Middleware matcher inclut `/api` OU garder audit CI strict | Sécurité |
| 7 | `withAuthApi` migration routes legacy restantes | Sécurité |
| 8 | Page ACL étendue (`/factures`, `/paiements`, `/pos`) | Sécurité |
| 9 | Split `clients/page.tsx` list + detail | UX |
| 10 | `FlowPageBanner` sur devis, production, livraisons | Hub commande |
| 11 | Export comptable CSV | Finance |

**Critère 5/5 sécurité :** audit auth vert + E2E role matrix vert.

---

## Vague 4 — Semaine 3 (Tests + UI → 5/5)

| # | Action | Dimension |
|---|--------|-----------|
| 12 | E2E `role-access.spec.ts` (commercial, caisse, production, lecture) | Tests |
| 13 | Tests API admin-backoffice v2 | Tests |
| 14 | Contraste AA complet (`AUDIT_360_COLOR_ACCESSIBILITY`) | UI |
| 15 | Tokens Orion 100 % écrans métier | UI |
| 16 | Enums Prisma statuts String → enum | Architecture |

**Critère 5/5 tests :** CI + E2E + verify drift + audit auth tous verts.

---

## Vague 5 — Semaine 4+ (Excellence métier)

| # | Action | Dimension |
|---|--------|-----------|
| 17 | Expert RH Madagascar — validation paie/CNaPS/IRSA | RH |
| 18 | Expert fiscal Madagascar — TVA, export comptable | Finance |
| 19 | GPAO auto-dossier E2E complet | Métier |
| 20 | WebSocket ANS Talk (remplace polling) | Performance |
| 21 | BI dashboard forecasting | Hub commande |

**Critère 5/5 RH/Finance :** validation expert signée + exports conformes.

---

## Commandes de contrôle 5/5

```bash
npm run typecheck
npm run test
npm run audit:api-auth
npm run verify:pos-prices
npm run sync:verify-drift
npm run test:e2e
npm run perf:audit
curl /api/admin-backoffice/pricing/audit   # avec session admin
```

---

## Vague 5 — Livré (2026-07-05)

| # | Item | Fichier / commande |
|---|------|-------------------|
| ✅ 19 | GPAO auto-dossier E2E 16 étapes | `e2e/gpao-auto-dossier.spec.ts` |
| ✅ 20 | SSE ANS Talk (+ fallback polling) | `app/api/messaging/stream/route.ts`, `lib/ans-talk/talk-stream-client.ts` |
| ✅ 21 | BI projection CA dashboard | `lib/cockpit/ca-forecast.ts`, widget dashboard |
| ✅ 18 | Métadonnées export comptable Mada | `lib/finance/mada-compliance-meta.ts` |
| ⚠️ 17–18 | Expert RH / fiscal local | Checklist metadata — validation humaine requise |

---

## Vague 6 — Livré (2026-07-05)

| # | Item | Dimension |
|---|--------|-----------|
| ✅ | Virtualisation listes devis, clients, livraisons, paiements, production | Performance |
| ✅ | Devis pageSize 50 + `virtualizeThreshold={50}` | Performance |
| ✅ | Alias API `admin-backoffice/sync-diagnostics` + `repair-payment-drift` | Architecture |
| ✅ | Definition of Done — virtualisation étendue | Performance |

**Listes virtualisées (seuil 50) :** commandes, stock, devis, clients (tableau), livraisons, paiements, production (vue liste).

---

## Vague 7 — Finalisation (2026-07-05)

| # | Item | Dimension |
|---|--------|-----------|
| ✅ | `GET /api/export/catalog-pos` | Data / Sync |
| ✅ | `POST /api/admin/sync/run` | Architecture |
| ✅ | Alias API backoffice → admin-backoffice (catalog, workflows, templates, sync) | Architecture |
| ✅ | Centre sync + export panel branchés sur v2 | UX backoffice |
| ✅ | Checklist déploiement enrichie CI drift/prix | Ops |

---

## Definition of Done — projet « perfect »

- [ ] Tous scores audit ≥ 4.8/5 (RH/Finance avec certificat expert)
- [x] CI 100 % vert sans continue-on-error
- [x] 0 drift critical sync en CI (seed + verify)
- [x] 0 route API non protégée (audit auth)
- [x] POS = backoffice publié (verify prices CI)
- [ ] Paiements = ledger (payment drift 0 prod)
- [x] E2E legacy + role matrix + chaine commerciale + GPAO dossier
- [x] Virtualisation listes > 50 lignes
- [x] Design AA + radius 7px partout

---

*Référence : `docs/AUDIT_COMPLET_AMELIORATION_MASTER.md`*
