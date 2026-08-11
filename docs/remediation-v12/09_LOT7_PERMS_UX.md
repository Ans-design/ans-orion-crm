# V12 — Lot 7 Permissions / UX sync / KPI fraîcheur

## Livré

- `PermissionPolicyMeta` + `bumpPermissionPolicyVersion` + outbox `PermissionPolicyChanged`.
- `SyncStateBadge` sur Centre sync + `ModuleHeader` (design V11).
- Handlers outbox enregistrés.

## Statut

| Item | Statut |
|------|--------|
| policyVersion monotone | PASS |
| Wire bump sur chaque UI permission | PARTIAL (API helper prêt) |
| KPI asOf / DEGRADED généralisé | NOT_RUN (V13) |
| Talk events sans paie | NOT_RUN |
