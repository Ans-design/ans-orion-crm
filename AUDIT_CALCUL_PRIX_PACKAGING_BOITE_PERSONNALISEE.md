# Audit â€” Calcul prix Packaging Â« BoÃ®te personnalisÃ©e Â» (`pkg-boite`)

Date : 2026-07-14  
PÃ©rimÃ¨tre : remplacement du prix de vente `prixCm2` pour **`pkg-boite` uniquement**.

## DÃ©cision

| Ã‰lÃ©ment | Choix |
|--------|--------|
| Article | `pkg-boite` seulement (hangtag / doypack / sac / gobelet inchangÃ©s) |
| Source impression | Impression SF (tarif A4 Ã— Ã©quiv. format) |
| Source finitions | `FinishingPrice` / catalogue finitions Admin |
| GÃ©omÃ©trie | RÃ©utilise `lib/packaging/box-calculation.ts` |
| Fallback | `prixCm2` uniquement si le moteur packaging nâ€™est pas calculable |
| Multiplicateur dÃ©faut | dÃ©penses Ã— **1,40** (bÃ©nÃ©fice 30 % + marge dÃ©pense 10 %) |

## Formule

```txt
prixImpressionBrut     = prixA4ISF Ã— equivA4
prixDechetsMatiere     = prixImpressionBrut Ã— (margeDechetsPct / 100)   # dÃ©faut 10 %
prixImpression         = prixImpressionBrut + prixDechetsMatiere
prixFinitions          = Î£ (prixA4Finition Ã— equivA4)  [ou Ã— mÂ² si dÃ©coupe]
sousTotalDepenses      = prixImpression + prixFinitions + faÃ§onnage
bÃ©nÃ©fice               = sousTotal Ã— (beneficePct / 100)               # dÃ©faut 30 %
margeDepense           = sousTotal Ã— (margeDepensePct / 100)            # dÃ©faut 10 %
prixFinal              = sousTotal + bÃ©nÃ©fice + margeDepense
                     = sousTotal Ã— (1 + 0,30 + 0,10) = Ã— 1,40
```

Arrondi Ã©quivalent A4 (Admin) : dÃ©faut `exact` (`surface / 0.06237`) ; modes `ceil_a4` et `ceil_iso_format` disponibles.  
Override POS **Format Ã©quivalent** : Auto | A4â€¦A0 (A0 = 16 Ã— A4).

## Cas dâ€™acceptation â€” 50 400 Ar

HypothÃ¨ses mÃ©tier :

- MatiÃ¨re PCB 300 g â†’ A4 impression **1 500 Ar** (override test / exemple)
- Format Ã©quivalent **A0** â†’ facteur **16**
- Pelliculage A4 **600 Ar**
- DÃ©chets 10 %, bÃ©nÃ©fice 30 %, marge 10 %

| Ligne | Calcul | Montant |
|-------|--------|---------|
| Impression | 1 500 Ã— 16 | 24 000 |
| DÃ©chets 10 % | 24 000 Ã— 0,10 | 2 400 |
| Impression + dÃ©chets | | 26 400 |
| Pelliculage | 600 Ã— 16 | 9 600 |
| Sous-total dÃ©penses | | **36 000** |
| BÃ©nÃ©fice 30 % | 36 000 Ã— 0,30 | 10 800 |
| Marge 10 % | 36 000 Ã— Â·10 | 3 600 |
| **Prix final** | | **50 400 Ar** |

Test automatisÃ© : `tests/packaging-box-price.test.ts`.

## Architecture livrÃ©e

### Moteur (`lib/packaging/`)

- `packaging-a4-equivalence.ts` â€” surface A4, facteurs ISO, arrondis
- `packaging-admin-defaults.ts` â€” gabarits + marges dÃ©fauts + overlays runtime
- `packaging-box-price.ts` â€” `calculatePackagingSurface` / `calculatePackagingBoxPrice` / fromConfig
- `packaging-snapshot.ts` â€” snapshot gÃ©omÃ©trie `pkg-v1` + prix `pkg-v2-price`

### Admin / Prisma

- ModÃ¨les : `PackagingBoxTemplateRule`, `PackagingMarginRule`, `PackagingPricingRule`
- Page : `/administration/packaging`
- APIs : `/api/admin-backoffice/packaging` (+ import/export Excel multi-feuilles)
- Sync runtime : `lib/services/packaging-pricing-sync.service.ts`

### POS

- Chip **Format Ã©quivalent** sur `pkg-boite`
- `lib/pricing/calculate.ts` â†’ source `packagingBoxIsfFinitions` (ignore `prixCm2` si calculable)
- Panneau dÃ©tail : surface / Ã©q. A4 / ISF / dÃ©chets / finitions / dÃ©penses / bÃ©nÃ©fice / marge
- Panier : `_packagingSnapshotV2` (`pkg-v2-price`)

## Anomalies dÃ©tectÃ©es (service Admin)

- Formule / gabarit manquant
- Dimensions invalides
- MatiÃ¨re sans tarif ISF
- Finition sans prix catalogue
- % marges manquants
- Total nul

## Hors scope (volontaire)

- Refonte prix hangtag / doypack / sac / gobelet
- Migration Prisma 7
- Remplacement de la gÃ©omÃ©trie `box-calculation` (rÃ©utilisÃ©e)

## VÃ©rifications

```bash
npx vitest run tests/packaging-box-price.test.ts
npm run build
```txt
