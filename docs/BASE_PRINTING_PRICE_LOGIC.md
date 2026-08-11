# Logique prix base — impression sans finition

## Principe métier

Le prix de base d’un article imprimé = **matière + format + impression simple**, **sans finition** (pas pelliculage, vernis, dorure, découpe, reliure).

Ensuite, dans l’ordre :

1. Prix base impression sans finition (`BasePrintingPrice` publié)
2. Variables tarifaires (`ProductOptionGroup.impactsPrice = true`)
3. Matières / formats / dimensions (`BaseMaterial`, `MaterialPrice`)
4. Finitions (suppléments)
5. Paliers / remises (`DiscountTier`)
6. Urgence / délai
7. Remise autorisée
8. TVA
9. Total

## Règle prix max / sécurité

- `BaseMaterial.maxPrice` ou `BasePrintingPrice.maxSafetyPrice` sert de **plancher prudent** (prix le plus cher du groupe quand configuré).
- Alerte si prix base < coût ou marge < `minMargin`.

## Variables indicatives

- `ProductOptionGroup.isInformational = true` ou `impactsPrice = false` → **jamais** dans le total.
- Interdit : `impactsPrice` et `isInformational` simultanés (anomalie formula audit).

## POS

- Priorité : profil dynamique **publié** → prix base sans finition publié → tarifs métier (ISF, PLV…) → **pas PRIX 2026** (sauf `USE_PRIX_2026_LEGACY=true`).

## Backoffice

- Onglet **Matières de base** : `/administration/backoffice?tab=materials`
- Sous-onglets **Prix & Calculs** : vue globale Matières / Prix base sans finition

## APIs

- `GET /api/admin-backoffice/pricing/base-materials`
- `GET /api/admin-backoffice/pricing/base-printing`
- `GET /api/admin-backoffice/pricing/materials-used-pos`
