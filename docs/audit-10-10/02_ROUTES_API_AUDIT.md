# 02 — Routes & API Audit

## Synthèse

**~312 routes** sous `app/api/`. Concentration admin : **89 routes** (`admin-backoffice` 64 + `backoffice` 15 + `admin-config` 10).

## Répartition par domaine

| Préfixe | Routes | Rôle |
|---|---:|---|
| `admin-backoffice` | 64 | Prix, matières, options, publication |
| `admin` | 20 | Legacy admin |
| `stock` | 11 | CRUD stock, SKU, mouvements, anomalies |
| `pos` | 9 | Config article, pricing |
| `commandes` / `devis` / `clients` | 7 chacun | Flux commercial |
| `rh` | 12 | RH complet |
| `suppliers` | 2 | Fournisseurs |
| `purchase-orders` | 2 | Achats |

## Format réponse API

**Standard attendu :** `{ ok: true, data }` ou `{ ok: false, error: { code, message } }`

| Problème | Fichiers | Priorité | Correction |
|---|---|---|---|
| Routes legacy sans `ok` wrapper | `app/api/admin/*` partiel | P2 | Harmoniser progressivement |
| Double préfixe backoffice | `admin-backoffice` vs `backoffice` | P1 | Documenter alias ; fusion à terme |
| Permission incohérente | `production:read` stock vs `tarifs:write` matières | P2 | Matrice permissions centralisée |

## APIs récemment stabilisées (Vague 3-4)

| Route | Statut |
|---|---|
| `PATCH /api/admin-backoffice/pricing/base-material-prices/[id]` | ✅ |
| `POST .../publish`, `.../publish-all` | ✅ |
| `POST /api/stock` + mouvement initial | ✅ |
| `POST /api/stock/items/generate-sku` | ✅ |

## APIs à compléter (plan)

| Route manquante / partielle | Priorité | Module |
|---|---|---|
| `POST /api/stock/items/[id]/link-material` | P1 | stock-material-link |
| `GET /api/admin-backoffice/base-material-prices/anomalies` | P2 | material-price-anomaly |
| `GET /api/admin-backoffice/audit-log` unifié | P2 | audit |
| OpenAPI / Swagger | P3 | docs |

## Tests API

- `tests/admin-backoffice-api.test.ts` — overview, audit, publish-bulk ✅
- `tests/stock-module-guards.test.ts` ✅
- **Manque :** tests intégration matières PATCH, achats réception E2E

## Risques

- **P0 :** Route 500 sans JSON → corrigé via `safeErrorMessage` + `runApiHandler` sur routes critiques
- **P1 :** N+1 sur listes stock/commandes → voir PERFORMANCE report
