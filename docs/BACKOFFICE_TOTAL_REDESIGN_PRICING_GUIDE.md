# Backoffice — Guide impact prix / descriptif

## Principe

Chaque variable POS possède un flag **impacte le prix** (`impactsPrice`, `isInformational`).

- **Tarifaire** : recalcule le prix (format, quantité, matière, grammage, finition facturée…)
- **Descriptive** : visible et sauvegardée, **jamais** dans le calcul

## Résolution centralisée

`lib/pricing/price-impact-rules.ts` — `resolveFieldPriceImpact()`

Badges UI dans `ArticlePricingCard` et éditeurs inline.

## Variables généralement descriptives (liste prompt)

Remarque, détail, orientation, couleurs textile/goodies, type pelliculage/dorure/vernis, couleur acrylique/dos bâche, aspect œillets, souche couleur, etc.

## Attention

Ne **pas** marquer descriptif si la variable est réellement tarifaire pour l’article :
- Format, quantité, dimensions, surface, grammage, matière, reliure, laize, finition facturée

## Simulateur

`POST /api/backoffice/pricing/simulate` → `pricing-simulator.service.ts` → `resolvePrice` (moteur réel).

Le détail de calcul doit indiquer les variables ignorées (descriptives).

## Exemple

- Orientation = Portrait → descriptif → prix inchangé
- Format = A5 → tarifaire → prix recalculé
- Quantité = 100 → tarifaire → prix recalculé
