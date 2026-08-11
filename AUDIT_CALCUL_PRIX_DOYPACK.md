# Audit â€” Calcul prix Doypack (`pkg-doypack`)

Date : 2026-07-14

## DÃ©cision

Prix = **doypack vierge** (liste Admin) + **impression vinyle mÂ²** (Grand Format) + **dÃ©coupe** (Finitions) + **pose** (Finitions) + MO Ã©ventuelle.

Pas dâ€™ISF papier pour le corps du doypack.

## Formule

```txt
PU = prixVierge + (surfaceImpM2 Ã— prixVinylM2) + (surfaceImpM2 Ã— prixDecoupeM2) + posePiÃ¨ce + MO
Total = PU Ã— qty (âˆ’ remise palier si configurÃ©e cÃ´tÃ© calculate)
```

Zone impression :

- totale avant/arriÃ¨re = LÃ—H doypack
- recto-verso = Ã—2
- partielle / sticker = L_imp Ã— H_imp

## Acceptation 1 425 Ar

| Poste | Montant |
|-------|---------|
| Vierge 100Ã—150 | 1 000 |
| Vinyle 50Ã—50 â†’ 0,0025 mÂ² Ã— 40 000 | 100 |
| DÃ©coupe 0,0025 Ã— 10 000 | 25 |
| Pose petit format | 300 |
| **PU** | **1 425** |

## Livrables

- Moteur : `lib/packaging/doypack-price.ts`
- Tables : `DoypackBlankPrice`, `DoypackPrintRule`, `DoypackApplicationRule`, `DoypackLaborRule`
- Admin : `/administration/packaging-soft` (onglet Doypack)
- POS : options zone / dÃ©coupe / pose ; source `doypackSoftPackaging`
- Tests : `tests/soft-packaging-pricing.test.ts`
