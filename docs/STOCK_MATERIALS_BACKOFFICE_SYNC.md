# Stock ↔ Matières Backoffice — synchronisation

## Principe

| Couche | Rôle |
|--------|------|
| **Stock** | Quantités, fournisseurs, mouvements, seuils, prix achat opérationnel |
| **Matières DB** (`BaseMaterial`) | Prix base impression, formules, impact POS, publication |
| **Prix base sans finition** (`BasePrintingPrice`) | Lignes format/face liées à une matière |

Les deux premiers sont **liés** via `StockItem.baseMaterialId` ↔ `BaseMaterial.stockItemId`.

## Services

| Fichier | Rôle |
|---------|------|
| `stock-material-link.service.ts` | Liaison / déliaison stock ↔ matière |
| `material-stock-sync.service.ts` | Sync quantités, seuils, prix achat, unités stock → matière |
| `base-material-price-unified.service.ts` | Vue fusionnée matière + prix base pour le Backoffice |

## APIs

| Route | Action |
|-------|--------|
| `POST /api/stock/items/[id]/link-material` | Lier (crée matière brouillon si absente) |
| `POST /api/stock/items/[id]/unlink-material` | Délier |
| `POST /api/admin-backoffice/materials/[id]/link-stock` | Lier depuis Backoffice |
| `GET /api/admin-backoffice/materials/[id]/stock` | Résumé stock lié |

## Flux auto (matière interne / hybride)

1. Création stock avec `linkMaterial: true` ou catégorie `matiere_interne` / `hybride`
2. `linkStockToMaterial()` — recherche par `materialKey`, sinon `createBaseMaterial()` en brouillon
3. `syncMaterialFromStockItem()` — met à jour label, materialKey, famille, grammage, prix achat, seuils, unités, anomalies

**Déclencheurs sync automatique :**
- `updateStockItemRecord()` après modification
- `adjustStock()` après tout mouvement (entrée, sortie, ajustement)
- `receivePurchaseOrder()` après réception achat
- `createStockDirectSale()` après vente directe

## UI

- Stock : colonne catégorie, option liaison à la création
- Backoffice : `MaterialLinkedStockSummary.tsx` dans `BaseMaterialPricesTable.tsx`
- Workspace fusionné : **Administration → Prix personnalisés → Matières & prix de base**

## Types d'usage

- **Vente directe** — stock isolé possible ; pas de sync matière obligatoire
- **Utilisation interne** — liaison + sync automatiques attendues
- **Hybride** — les deux modes selon `vendableDirectement`
