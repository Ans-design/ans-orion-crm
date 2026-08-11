# 07 — Stock / Achats / Fournisseurs Audit

## Modèle 4 catégories

| Catégorie | ID | Usage |
|---|---|---|
| Vente directe | `vente_directe` | Revente sans production |
| Hybride | `hybride` | Vente + production |
| Matière interne | `matiere_interne` | Papier, vinyle, encre |
| Maintenance | `maintenance_piece` | Pièces machines |

**Réf :** `lib/data/stock-categories.ts`, `docs/STOCK_THREE_CATEGORIES_MODEL.md`

## SKU automatique

- **Service :** `lib/server/modules/stock/sku-generator.service.ts`
- **Règles :** 5 lettres nom + caractéristiques + suffixe rame (R500)
- **UI :** `StockItemCompleteModal` — génération temps réel, justification manuelle admin
- **API :** `POST /api/stock/items/generate-sku`

## Synchronisation Stock ↔ Matières

| Action | Service |
|---|---|
| Création stock + lien matière | `linkStockToMaterial` |
| Mouvement → sync matière | `material-stock-sync.service.ts` |
| Réception achat → stock | `purchase-order-service.ts` |
| Prix base depuis stock | `createStockItem` + `patchBaseMaterial` |

## Achats

- **Service :** `lib/services/purchase-order-service.ts`
- **UI :** `app/(app)/achats/page.tsx` — SKU picker, conversion, réception
- **Manque P1 :** Historique prix achat par fournisseur visible fiche stock

## Fournisseurs

- **Dédoublonnage :** `supplier-dedup.service.ts`
- **API :** `app/api/suppliers/`
- **Manque P2 :** Multi-contacts, groupes articles (ultraprompt)

## Mouvements

Types : `stock_initial`, `entree`, `sortie`, `production`, `vente_directe`, `perte`, `retour`, `ajustement`

## Problèmes résolus récents

- ✅ Formulaire stock refondu (blocs, conditionnel)
- ✅ Mouvement initial à la création
- ✅ 4 catégories filtres page stock
- ✅ Modal « Depuis stock » côté matières

## Problèmes restants

| ID | Problème | Priorité |
|---|---|---|
| STK-01 | Module `purchases/` thin — logique dans `lib/services` | P1 |
| STK-02 | Tickets maintenance ↔ consommation stock | P2 |
| STK-03 | Fournisseur rapide depuis modal stock | P2 |
| STK-04 | Transfert inter-dépôts UI | P3 |

## Tests

- `tests/stock-list-stats.test.ts` ✅
- `tests/stock-module-guards.test.ts` ✅
