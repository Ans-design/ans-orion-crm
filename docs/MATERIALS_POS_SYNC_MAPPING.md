# Sync POS ↔ Matières DB

## Flux

```
Catalogue officiel + SUPPLEMENTARY
  → BaseMaterial (materialKey: base:grammage)
  → Prix base sans finition (BasePrintingPrice)
  → Formules publiées
  → POS
  → Panier / Devis snapshot
```

## Mapping Options/Chips

Chaque option matière/support POS doit avoir une entrée `BaseMaterial` avec même clé normalisée.

Audit : `GET /api/admin-backoffice/materials/audit-pos`

## Complétude

`GET /api/admin-backoffice/materials/completeness` — matrice statuts par matière.

## Sync catalogue

Bouton « Sync catalogue » → `importAllCatalogMaterialsToDb()` — crée les lignes manquantes en brouillon.
