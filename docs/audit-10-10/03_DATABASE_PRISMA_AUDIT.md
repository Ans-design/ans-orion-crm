# 03 — Database & Prisma Audit

## Synthèse

Schema Prisma unique `prisma/schema.prisma` — SQLite dev / PostgreSQL prod. **Validation OK.**

## Modèles métier clés

| Modèle | Rôle | Sync |
|---|---|---|
| `BaseMaterial` | Matières & prix base | ↔ StockItem |
| `BasePrintingPrice` | Prix impression sans finition par article | Publication |
| `StockItem` | 4 catégories, SKU, conversions | ↔ BaseMaterial |
| `StockMovement` | Traçabilité entrées/sorties | Post-ajustement |
| `Supplier` | Fournisseurs | ↔ Stock, achats |
| `PurchaseOrder` / `PurchaseOrderLine` | Achats | → Stock |
| `Devis` / `Commande` | Snapshots prix | Immuables post-validation |
| `SalePrice2026` | **Legacy** | Désactivé par défaut |

## Champs récents Stock (intégration ultraprompt)

- `stockCategory`, `supplierId`, `baseMaterialId`
- `unitDisplay`, `unitStandard`, `conversionFactor`
- `salePrice`, `marginPct`, `vendableDirectement`
- `family`, `subFamily`, `machineCompatible`, etc.

## Problèmes

### P1 — Migrations vs db push local

- **Problème :** Dev local souvent en `db push` ; prod en migrations
- **Impact :** Drift schema environnements
- **Correction :** `npm run db:sync`, migrations nommées pour changements prod
- **Test :** `npx prisma validate`, `verify:production`

### P1 — Index manquants listes volumineuses

- **Tables :** StockItem, BaseMaterial, OptionChip
- **Impact :** Lenteur recherche backoffice
- **Correction :** Index sur `sku`, `materialKey`, `publicationStatus`
- **Effort :** S

### P2 — Doublon naming materiels/materiels/materials

- **Fichiers :** `materials/`, `materiels/` modules
- **Correction :** Alias documentés, pas de suppression (règle zéro suppression)

## Intégrité données

| Règle | Implémentation |
|---|---|
| Prix publié seul en POS | `publicationStatus: published` |
| Snapshot devis | JSON snapshot sur Devis/Commande |
| SKU unique | `ensureUniqueSku` + contrainte DB |
| Stock ≥ réservé | `adjustStock` validation |

## Tests

- `tests/prisma-filters.test.ts`
- `tests/stock-list-stats.test.ts`
