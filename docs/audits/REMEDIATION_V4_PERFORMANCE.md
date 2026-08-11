# REMEDIATION V4 — Mesures performance (Lot D)

Date : 2026-07-30

| Zone | Avant | Après |
|------|-------|-------|
| Stock list | 2× findMany unbounded | page ≤50 (max 100) + count KPI + suggest≤30 |
| Matières conflict keys | take:5000 | take:1000 récente |
| GPAO dossiers | take:100 fixe | page/pageSize + total |
| Rapports | ~12 findMany lignes | aggregates / groupBy (+ employees/creances bornés) |
| Planning pool commandes | pageSize 100 | pageSize 40 |
| Achats stock select | GET /api/stock complet | suggest=1 + q debounced |
| FAB Talk | pollingActive 8s | badge-only (Lot A/D6) |

Fichiers : `stock.service.ts`, `gpao-dossier-service.ts`, `reports-service.ts`, `achats/page.tsx`, `planning/page.tsx`.
