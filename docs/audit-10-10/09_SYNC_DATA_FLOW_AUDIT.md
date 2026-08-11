# 09 — Sync & Data Flow Audit

## Matrice officielle

Réf : `docs/SYNC_MATRIX.md`, `lib/services/sync-drift-service.ts`

## Flux par entité

| Source | Cible | Service | Déclencheur |
|---|---|---|---|
| Backoffice config | DB | PATCH APIs | Sauvegarde |
| DB draft | DB published | `pricing-publication.service` | Publish |
| Published | POS moteur | `pricing-pos-sync.service` | Publish |
| StockItem | BaseMaterial | `material-stock-sync` | CRUD/mouvement |
| Stock | Matières prix | `linkStockToMaterial` | Création/liaison |
| Achats réception | Stock + mouvement | `purchase-order-service` | Réception |
| POS/Devis | Snapshot JSON | `snapshots/` | Création devis |
| Commande | Production/Stock | `commande-module-sync` | Statut |

## Services sync inventoriés

1. `material-stock-sync.service.ts`
2. `stock-material-link.service.ts`
3. `pricing-publication.service.ts`
4. `pricing-pos-sync.service.ts`
5. `pricing-sync-audit.service.ts`
6. `backoffice-sync.service.ts`
7. `sync-drift-service.ts`
8. `catalogue-sync-service.ts`
9. `commande-module-sync.ts`
10. `production-commande-sync.ts`
11. `bat-gpao-sync.ts`
12. `orion-sync.ts`

## Règles immuables

- **Devis/commande validés** : snapshot prix figé — modification backoffice n'affecte pas l'historique ✅
- **POS** : uniquement `published` ✅
- **PRIX 2026 DB** : désactivé ✅

## Problèmes drift

| ID | Drift possible | Détection | Priorité |
|---|---|---|---|
| SYNC-01 | Matière sans stock lié | Anomalies matières | P1 ✅ |
| SYNC-02 | Option chip vs formule | `sync-drift-service` | P1 |
| SYNC-03 | Catalogue vs DB articles | Centre sync | P2 |
| SYNC-04 | Stock qty vs matière affichée | `enrichMaterialWithStock` | P1 ✅ |

## API sync

- `GET/POST /api/backoffice/sync`
- `POST /api/admin-backoffice/pricing/sync-pos`
- `GET /api/sync/stats`
- Cron `orion-daily`

## Tests

- `tests/sync-drift.test.ts` ✅
