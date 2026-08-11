# Unités commerciales et conversions standard

## Principe

Afficher l'unité commerciale (rame, rouleau, paquet) ; calculer en unité standard (feuille, m², pcs).

## Champs BaseMaterial

| Champ | Exemple |
|---|---|
| `unitDisplay` | rame |
| `unitStandard` | feuille |
| `conversionFactor` | 500 |

## Exemples

| Matière | Affichage | Conversion | Standard |
|---|---|---|---|
| Offset 80g | 1 rame | ×500 | feuilles |
| Bâche 440g | 1 rouleau | ×80 | m² |
| Enveloppes | 1 paquet | ×100 | pcs |

## Service

`lib/server/modules/materials/materials-unit-conversion.service.ts`

## Anomalies

- Rame sans nombre de feuilles
- Rouleau sans surface
- Impact stock sans stock lié
