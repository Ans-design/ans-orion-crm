# V13 — Time & scope contract

- Timezone métier : `Indian/Antananarivo` (`lib/kpi/business-clock.ts`)
- Bornes : `[from, to)` via `prismaDateRangeFilter`
- Contexte : `buildKpiQueryContext` — `requestedRole` client ignoré
- Migration progressive : `dashboard-stats` signale encore `timezoneNote: server-local` dans kpiMeta jusqu’à bascule complète des presets
