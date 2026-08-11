# Audit â€” Calcul prix Ã‰tiquette / Gobelet / Hangtag

Date : 2026-07-14

## Ã‰tiquette prÃ©dÃ©coupÃ©e (`pkg-etiquette`)

| Mode | RÃ¨gle |
|------|--------|
| Standard **50Ã—50 cm** | Liste `PrecutLabelStandardPrice` â€” blanc **10 000** / transparent **12 000** Ar |
| PersonnalisÃ© | surface mÂ² Ã— vinyle GF + dÃ©coupe Finitions (mÂ²) |

Moteur : `lib/packaging/precut-label-price.ts` Â· source POS `precutLabelVinyl`

## Gobelet personnalisÃ© (`pkg-gobelet`)

MÃªme schÃ©ma que Doypack : `CupBlankPrice` + zone impression + vinyle/dÃ©coupe/pose (ou technique piÃ¨ce).

Moteur : `lib/packaging/custom-cup-price.ts` Â· source `customCupSoftPackaging`

Exemple : vierge 1000 + sticker 50Ã—50 (100) + dÃ©coupe 25 + pose 300 = **1 425 Ar**

## Hangtag (`pkg-hangtag`)

```txt
PU = (ISF_feuille + finitions_feuille) / piÃ¨ces_par_feuille
   + accessoires (cordelette, Å“illetâ€¦)
   + dÃ©coupe piÃ¨ce
```

- ISF : Impression sans finition  
- Imposition : `HangtagImpositionRule` (prioritaire) ou calcul auto  
- Accessoires : `HangtagAccessoryPrice`  
- Finitions feuille : catalogue Finitions  

Moteur : `lib/packaging/hangtag-price.ts` Â· source `hangtagIsfImposition`

## Administration

Page unique : **`/administration/packaging-soft`**  
API : `/api/admin-backoffice/packaging-soft` (liste, seed, anomalies, PATCH inline)  
Export JSON multi-feuilles (prÃ©paration Excel).

Sync runtime : `lib/services/soft-packaging-pricing-sync.service.ts`

## Tests

`tests/soft-packaging-pricing.test.ts` â€” standards Ã©tiquette, doypack 1425, gobelet 1425, hangtag imposition.
