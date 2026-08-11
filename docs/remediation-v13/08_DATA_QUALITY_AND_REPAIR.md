# V13 — Data quality & repair

- emptyDatabase → `kpiMeta.quality = NO_DATA` (pas FRESH)
- PARTIAL sources → warnings dans kpiMeta
- Santé entreprise : pas de status `ok` si PARTIAL/STALE ; ERROR/NO_DATA → score 0
- Réparation : rejouer outbox + `advanceKpiWatermark` + resync Centre synchronisation
