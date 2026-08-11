# Audit — Calcul prix Sac en papier personnalisé (`pkg-sac`)

Date : 2026-07-14

## Décision

Même logique que **Boîte personnalisée** :
surface développée → équivalent A4 → Impression SF + Finitions + Accessoires → dépenses × **1,40** (bénéfice 30 % + marge 10 %).

## Surface développée

```txt
largeurDéveloppée = 2L + 2P + patteCollage
hauteurDéveloppée = H + rabatHaut + (P × coefficientFond)
surface = largeur × hauteur  (m²)
surfaceAvecDéchets = surface × (1 + margeDéchets%)
```

Coefficients Admin (`PaperBagTemplateRule`) : patte 20 mm, rabat 30 mm, coeff fond 0,85, déchets 10 %.

## Acceptation — 50 400 Ar

PCB 300g · équiv. A0 · pelliculage A4 600 Ar · sans accessoire :

| Poste | Montant |
|-------|---------|
| ISF 1 500 × 16 | 24 000 |
| Déchets 10 % | 2 400 |
| Pelliculage 600 × 16 | 9 600 |
| Dépenses | 36 000 |
| × 1,40 | **50 400** |

## Livrables

- Moteur : `lib/packaging/paper-bag-price.ts`
- Défauts : `lib/packaging/paper-bag-admin-defaults.ts`
- Sync : `lib/services/paper-bag-pricing-sync.service.ts`
- Prisma : `PaperBagTemplateRule`, `PaperBagMarginRule`, `PaperBagAccessoryPrice`, `PaperBagPricingRule`
- Admin : `/administration/packaging-sac`
- POS : chips type / format équiv. / finitions / poignées / œillets — source `paperBagIsfFinitions`
- Tests : `tests/paper-bag-price.test.ts`
