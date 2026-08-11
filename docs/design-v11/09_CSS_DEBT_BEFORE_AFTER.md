# Design V11 — CSS debt before/after

| Métrique | Before (baseline-metrics) | After vague tokens |
|----------|---------------------------|--------------------|
| Info = brand | oui | non (`#2563EB`) |
| Radius unique 7px | oui | échelle 8/12/16 |
| Imports globals | ~30 | inchangé (Lot 6 NOT_RUN) |
| !important | élevé | inchangé (purge Lot 6 NOT_RUN) |

Plafond note design : cascade concurrente encore présente → max ~7,5 tant que Lot 6 non fait.
