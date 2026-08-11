# Pilotage — Matrice de remédiation V5

Date : 2026-07-30 · Prompt V5 · Baseline : `PILOTAGE_BASELINE_2026-07-30.md`

| ID | État initial | Fichier(s) | Correction | Test/preuve | Résultat | Remarque |
|----|--------------|------------|------------|-------------|----------|----------|
| CK-01 | OPEN fuite marge | `api/dashboard/stats`, `margin-access.ts`, `dashboard/page.tsx` | `stripDashboardMarginFields` + UI `useCanViewMargin` | `pilotage-remediation-v5.test.ts` | **PASS** | |
| CK-02 | OPEN doublon ops | `dashboard-header.tsx` | CTA « Voir les opérations » + label synthèse | lint/typecheck | **PASS** | Onglet ops conservé (zéro suppression) |
| CK-03 | PARTIAL poll 45s | `dashboard/page.tsx` | Interval 75s + visibility | code review | **PASS** | |
| CK-04 | OPEN findMany | `dashboard-stats.ts` | `take` bornés (200/500/2k/5k) | code | **PASS** | Agrégats totaux encore partiels |
| CK-05 | OPEN roleParam | `api/cockpit/stats` | Ignore `?role=` ; session only | code + typecheck | **PASS** | |
| CK-06/07 | OPEN home | `page-access.ts` | `/dashboard` → admin/manager/demo/finance | page-access + pilotage tests | **PASS** | |
| OP-01 | FIXED V4 | `operations/page.tsx` | `/commandes/${id}` | code | **PASS** | Préexistant |
| OP-02 | OPEN CA atelier | `stripOperationsFinancial`, ops page | Strip API + UI finance | pilotage tests | **PASS** | |
| OP-03 | OPEN refresh | `operations/page.tsx` | Bouton + poll 60s + visibility + Abort | code | **PASS** | |
| OP-04 | OPEN RhPointage | — | Conservé résumé ops + cockpit | — | **PASS** | Lien croisé via CTA ops |
| OP-05 | OPEN flow | `operations/page.tsx` | `FlowContextBanner` | typecheck | **PASS** | |
| OP-07 | PARTIAL | `operations/page.tsx` | `formatPrice` via french-typography | typecheck | **PASS** | |
| RP-01 | FIXED V4 | `api/reports/export` | Route + CSV sanitize `;` + BOM | code | **PASS** | Renforcé V5 |
| RP-02 | FIXED V4 | `stripMarginFromReport` | `rh:payroll_read` | tests | **PASS** | |
| RP-03 | PARTIAL | `reports-service.ts` | Déjà agrégats ; take employés/factures | audit code | **PASS** | Préexistant |
| RP-04 | PARTIAL demo | page-access + nav filter | demo sans `/rapports` | pilotage test | **PASS** | |
| RP-05 | OPEN hub | `rapports/page.tsx` | Liens listes / hub commandes | code | **PASS** | Agrégats → filtre statut |
| RP-06 | OPEN zeros | `api/reports` | `serverError` au lieu de faux zéros | code | **PASS** | |
| PF-01 | OPEN gate | `api/rapports/performance`, page-access | `rapports:read` OR `production:read` | page-access | **PASS** | Scope machines prod |
| PF-02 | OPEN lazy | `rapports/performance/page.tsx` | `next/dynamic` charts | code | **PASS** | |
| PF-03 | OPEN error | performance page | EmptyState + Réessayer | code | **PASS** | |
| PF-04 | OPEN nominatif | `stripNamedTeamPerformance` | Vide scores si !`rh:read` | pilotage tests | **PASS** | |
| HI-01 | OPEN commande= | historique page + audit API | Filtre `commande` / `entityId` | code | **PASS** | |
| HI-02 | OPEN lien | historique page | Link dossier Commande | code | **PASS** | |
| HI-03 | OPEN debounce | historique page | 300 ms + AbortController | code | **PASS** | |
| HI-04 | OPEN group CM | `module-registry.ts` | `group: rapports_analyse` | pilotage test | **PASS** | |
| HI-05 | OPEN nav CM | `role-registry.ts` | Retrait historique commercial | code | **PASS** | |
| Alias /cockpit | OK | `next.config.js` | Redirect permanent | config | **PASS** | Non modifié |

## Non exécuté

| Contrôle | Résultat | Cause |
|----------|----------|-------|
| E2E Playwright Pilotage | **BLOCKED** | Pas de serveur e2e lancé dans cette session |
| Git diff --stat | **BLOCKED** | Dépôt sans `.git` |
