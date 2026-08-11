# Rapport consolidation API — Vague 2 (V2-07)

| Date | 2026-07-18 |
|------|------------|
| Règle | **Zéro suppression** de routes — re-export / documenter / aligner permissions |

## Actions appliquées (sûres)

| Alias | Canon | Action |
|-------|-------|--------|
| `/api/stock/items/generate-sku` | `/api/stock/generate-sku` | Re-export |
| `/api/admin-backoffice/anomalies` | `/api/backoffice/anomalies` | Re-export (`?limit=`) |
| `/api/admin-backoffice/materials/audit-pos` | `/api/admin-backoffice/pricing/materials-used-pos` | Re-export |
| `/api/backoffice/sync` | — | Permission → `config:publish` (aligné sync-pos / publish) |

## Clusters (ne pas fusionner brutalement)

| # | Famille | Canon | Aliases / notes | Risque |
|---|---------|-------|-----------------|--------|
| 1 | Publish | `/api/backoffice/publish` | admin-backoffice/publish ; admin-config/publish = **contrat distinct** | P0 doc |
| 2 | Sync POS | `/api/backoffice/sync` | sync-pos aliases ; **pricing/sync-pos** = catalogue+matières | P0 |
| 3 | Prix runtime | `/api/pos/price-preview` | pos/pricing ; pricing/calculate ; simulate = lecture | P0 |
| 4 | Articles | backoffice/articles vs pricing/articles | Domaines distincts | P1 |
| 5 | Import matières | materials-import.route | 3 paths re-export déjà | P1 |
| 6 | Materials CRUD | pricing/base-materials | materials/* aliases | P2 |
| 7 | Anomalies | backoffice/anomalies | pricing/anomalies = scanner dédié | P1 |
| 8 | Audit | admin-backoffice/audit-log | scopes distincts | P1 |
| 9 | Stock | `/api/stock` | items/* aliases | P2 |
| 10 | Repair | backoffice/repair-payment-drift | `config:publish` | P0 |

## Procédure future (sans suppression)

1. Caractériser → 2. Service canon → 3. Alias re-export → 4. Migrer front → 5. Observer → 6. Masquer doc (vague ultérieure validée)

## Tests

`tests/v2-api-consolidation.test.ts` — aliases re-export présents.
