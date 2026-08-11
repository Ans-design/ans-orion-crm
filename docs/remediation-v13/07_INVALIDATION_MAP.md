# V13 — Invalidation map

Code : `lib/kpi/invalidation-map.ts`

| Événement V12 | KPI affectés |
|---------------|--------------|
| DevisAccepted | COM-005, COM-007, DIR-002, PRO-* |
| PaiementRecorded | DIR-001, FIN-*, LOG-FIN-COUNT |
| LivraisonCompleted | LOG-*, PRO-004 |
| PermissionPolicyChanged | * |

`advanceKpiWatermark()` → clearDashboardSliceCache. Multi-instance durable = PARTIAL (watermark process-local).
