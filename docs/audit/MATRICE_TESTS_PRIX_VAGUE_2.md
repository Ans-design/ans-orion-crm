# Matrice tests prix — Vague 2

| ID | Famille | Cas | Entrée | Attendu | Fichier test | Statut |
|----|---------|-----|--------|---------|--------------|--------|
| P-QTY | Qty | 0 / négatif / string | raw | normalize → 1 | Lot3 golden | OK |
| P-TIER | Paliers | avant / seuil / après | tiers config+DB | PU correct | Lot3 golden | OK |
| P-VOL | Volume | 99/100/500/1000 | DEFAULT tiers | rates 0/5/10/15 % | Lot3 golden | OK |
| P-PROMO | Promo | 0/12.5/100 % | PU | arrondi MGA | Lot3 golden | OK |
| P-GF | Grand format | 1000×500 mm | 40k/m² | 20 000 | Lot3 golden | OK |
| P-SRC | Source POS | mock calculatePrice | snapshot.priceSource | propagé | `v2-pricing-canonical` | OK |
| P-MGA | Arrondi | TTC→HT 20 % | 10001 | 8334 entier | `v2-pricing-canonical` | OK |
| P-SNAP | Snapshot | devis→cmd→facture | acceptation | pas de recalcul | code path | Documenté |
| P-FLY | Flyer | pliage ISF | config | famille test | `flyer-pricing` | OK existant |
| P-TEX | Textile | remises | config | famille test | `textile-pricing` | OK existant |

## Règle de mise à jour golden

Si un total attendu change : **expliquer** la règle métier et demander validation — ne pas écraser silencieusement.
