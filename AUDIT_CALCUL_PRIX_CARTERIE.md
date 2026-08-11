<!-- markdownlint-disable MD012 MD022 MD032 MD036 MD040 MD056 MD058 -->

# AUDIT â€” Calcul prix Carterie

Date : 2026-07-12  
PÃ©rimÃ¨tre : Catalogue POS (`cv-std`, `cv-fidelite`, `cv-jeux`) + Administration Catalogue, Prix & Stock

## Formule appliquÃ©e

```txt
prixUnitaire =
  (prixImpressionFeuilleISF + Î£ finitionsFeuille) / piÃ¨cesParFeuille
  + prixDÃ©coupeParPiÃ¨ce

prixTotal = prixUnitaire Ã— qty âˆ’ remisePalierISF
```txt

Exemple acceptÃ© (PCB 300g, pelliculage, gaufrage) :

| Poste | Montant |
|-------|---------|
| Impression A4 | 2 000 |
| Pelliculage A4 | 1 200 |
| Gaufrage A4 | 3 000 |
| **Feuille** | **6 200** |
| Ã· 10 piÃ¨ces | 620 |
| + dÃ©coupe | 50 |
| **Unitaire** | **670 Ar** |

## Sources

| Source | RÃ´le |
|--------|------|
| Impression sans finition | Prix feuille (format A4/A3â€¦, matiÃ¨re, grammage, face) |
| Finitions & Reliures | Pelliculage, gaufrage, dorure, vernis, coins, dÃ©coupe |
| `CarterieImpositionRule` (SystemConfig) | PiÃ¨ces / feuille (manuel > auto) |
| Paliers ISF | Remise quantitÃ© (flag Admin) |

**Aucune duplication** des grilles ISF / finitions dans une table Carterie de prix matiÃ¨re.

## Fichiers

| Fichier | RÃ´le |
|---------|------|
| `lib/pricing/carterie-imposition.ts` | `calculatePiecesPerSheet` |
| `lib/pricing/carterie-pricing.ts` | `computeCarteriePrice` |
| `lib/pricing/carterie-pricing-rules.ts` | RÃ¨gles + Excel columns |
| `lib/services/carterie-pricing-sync.service.ts` | Persist + sync FinishingPrice |
| `lib/pricing/calculate.ts` | Branche `carterieIsfImposition` |
| `lib/data/config-types/products/carterie.ts` | Chips finitions, `priceTiers: []` |
| `lib/finition/finition-price-catalog.ts` | `gaufrageA4: 3000` + ligne Admin |
| Admin UI / API | `/administration/carterie-regles`, onglet **Carterie** |
| POS | `carterieBreakdown` dans panneau tarif |
| `tests/carterie-pricing.test.ts` | Tests 670 Ar + imposition |
| `AUDIT_CALCUL_PRIX_CARTERIE.md` | Ce rapport |

## Tests

```txt
npx vitest run tests/carterie-pricing.test.ts
```

- 85Ã—55 â†’ 10 / A4  
- Exemple 670 Ar  
- Sans finition 250 Ar  
- Coins feuille Ã· piÃ¨ces  
- Format perso â†’ capacitÃ© Ã  dÃ©finir  

## POS

Affiche : impression feuille, chaque finition feuille, piÃ¨ces/feuille, avant dÃ©coupe, dÃ©coupe, unitaire, qty, total.  
Snapshot panier/devis : `carteriePricing` + `carterieNote`.

## Administration

- `/administration/catalogue-prix-stock?tab=carterie`  
- `/administration/carterie-regles`  
- Export Excel : `02_CARTERIE_FORMATS_IMPOSITION`, `05_CARTERIE_REGLES_PRIX`  
- Liens ISF / Finitions / Paliers  

## Anomalies

- Source ISF absente  
- DÃ©coupe absente  
- Format sans dimensions / 0 piÃ¨ce  
- Format perso sans capacitÃ©  
- Article cv-* non synchronisÃ©  

## CritÃ¨res

| # | CritÃ¨re | Statut |
|---|---------|--------|
| 1â€“2 | ISF + Finitions | OK |
| 3 | PiÃ¨ces / feuille | OK (auto + manuel) |
| 4â€“5 | DÃ©coupe aprÃ¨s Ã· Â· 670 Ar | OK (tests) |
| 6â€“7 | Admin modifiable | OK |
| 8â€“9 | DÃ©tail POS / snapshot | OK |
| 10â€“11 | Excel + anomalies | OK |
| 12 | Sync runtime | OK |
| 13 | Build | Relancer aprÃ¨s arrÃªt `preview:local` si EPERM Prisma |

## Suites

- Ã‰tendre formats voeux (A6/A5/DL) sur un article carterie dÃ©diÃ© si besoin (aujourdâ€™hui `evt-carte-voeux` = Ã©vÃ©nementiel)  
- Feuilles Excel 01/03/04/06 (articles, matiÃ¨res, finitions compatibles, paliers) = liens documentÃ©s ; donnÃ©es prix restent ISF / Finitions / Paliers existants  
