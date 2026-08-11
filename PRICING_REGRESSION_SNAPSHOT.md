# Snapshot non-régression prix (avant / pendant refonte Admin)

Date : 2026-07-14  
Fichier de test : `tests/pricing-regression.test.ts`

Ces montants doivent rester **identiques** tant que la refonte ne touche pas volontairement une formule métier.

## Cas figés

| ID | Domaine | Entrée clé | PU attendu |
|----|---------|------------|------------|
| REG-CART-670 | Carterie | 85×55 PCB 300g + pellic 1200 + gauf 3000 + découpe 50 / 10 p. | **670** |
| REG-BOX-50400 | Packaging boîte | A0, ISF 1500, pellic 600, déchets 10 %, ×1,40 | **50400** |
| REG-SAC-50400 | Sac papier | A0, ISF 1500, pellic 600, ×1,40 | **50400** |
| REG-DOY-1425 | Doypack | vierge 1000 + vinyle 0,0025×40k + découpe + pose 300 | **1425** |
| REG-CUP-1425 | Gobelet | même schéma sticker 50×50 | **1425** |
| REG-ETIQ-W-10000 | Étiquette | 50×50 cm vinyle blanc | **10000** |
| REG-ETIQ-T-12000 | Étiquette | 50×50 cm transparent | **12000** |

## Moteurs exclus de la refonte UI

Toute divergence hors justification métier = **échec** de la refonte.

Commande : `npx vitest run tests/pricing-regression.test.ts`
