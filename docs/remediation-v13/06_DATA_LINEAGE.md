# V13 — Data lineage (résumé)

Sources canoniques : voir `02_KPI_DICTIONARY.md` et registre `lib/kpi/registry.ts`.
Projections : dashboard-slices (TTL 20s) + watermark process (`lib/kpi/invalidation-map.ts`).
Outbox V12 avance le watermark sur DevisAccepted / PaiementRecorded / LivraisonCompleted.
