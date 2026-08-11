# Inventaire sémantique monétaire ANS ORION

Généré / maintenu avec la remédiation intégrité monétaire (2026-08-05).  
Ne pas convertir automatiquement tout `Float` en `Int`.

## Légende catégories

1. **montant MGA** — ariary entier (`Int`)  
2. **pourcentage** — taux 0–100 (`Float`)  
3. **ratio / multiplicateur** — facteur décimal (`Float`)  
4. **dimension** — mm/cm/m (`Float`)  
5. **quantité** — unités métier (`Float`/`Int`)  
6. **mesure physique** — kg, surface, yield (`Float`)  
7. **ambiguë** — à clarifier avant migration

## Montants MGA (déjà `Int` — suites 4–6)

Commande (`total`, `acompte`, `reste`), Paiement (`montant`), Facture / Devis (`sousTotal`, `remise`, `totalHT`, `totalTTC`), lignes devis/commande, Tarif, StockItem (`unitCost`, `salePrice`, …), RH (`salaireBaseMGA`), caisse, achats, grilles Admin (BasePrinting, SalePrice2026, goodies, textile, photo, event, packaging…), DirectSale prices.

**Choix type :** `Int` Int32. Max observé local Commande.total = 1 250 000 Ar.  
Upgrade si préflight `out_of_int32` → `Decimal(18,0)` (pas BigInt par défaut).

## Volontairement décimaux (ne pas Int)

| Champ / famille | Cat. | Motif |
|-----------------|------|-------|
| `Facture.tva`, `vatRate` | 2 | taux % |
| `DiscountTier.discountPercent` | 2 | remise % |
| `*marginPct`, `marginPercent`, `beneficePct`, `margeDechetsPct` | 2 | marges % |
| `surchargePercent`, `wastePct` | 2 | % |
| `ProductOptionValue.priceMultiplier` | 3 | ratio option |
| `conversionFactor`, `coeff*`, `surfaceRatio`, `ratioA4` | 3 | facteurs |
| `widthMm`, `heightMm`, `laize*`, `surfaceM2`, … | 4 | dimensions |
| `quantity`, `reservedQty`, `minQty`, stock qty | 5 | quantités |
| `poidsKg`, `yieldM2`, `lengthM` | 6 | physique |
| `congeSolde` | 5/7 | jours (pas MGA) |
| `score` | 7 | non monétaire |

## Cas traité : `ProductOptionValue.priceModifier`

| Avant | Usage réel |
|-------|------------|
| `Float priceModifier` + `modifierType` | `fixed`/`piece`/`m2` = **Ar** ; `multiplier` = **ratio** |

**Inventaire local (2026-08-05) :** 4975 valeurs — `fixed` 4405, `piece` 570, `multiplier` 0 ; **0** fractionnaires ; **0** ambiguës.

**Après :**

- `priceAddonAr Int` — supplément MGA  
- `priceMultiplier Float` — ratio  
- `priceModifier Float` — legacy dual-read/write (drop différé)

Ambiguës potentielles (règles détection) : multiplier avec `|v|>5` ; montant avec `0<|v|<1` non entier.

## Frais livraison / crédit / avoir

Chercher montants via modèles Finance / Paiement / Facture (`Int`). Aucun champ unique `fraisLivraison` Float résiduel dans le ledger CRM principal — vérifier modules logistique au cas par cas (préflight étendu possible).

## Calculateur central

`lib/money/mga.ts` : add, sub, remise %, remise fixe, TVA, solde, trop-perçu, remboursement, marge, format, parse strict, sérialisation JSON.  
Options : `lib/money/option-modifier.ts`.
