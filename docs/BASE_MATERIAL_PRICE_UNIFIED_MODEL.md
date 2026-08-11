# Matières & prix de base — modèle unifié

## Objectif

Fusionner **Matières de base** et **Prix base sans finition** en une seule interface :
**« Matières & prix de base »** — source du calcul prix avant finitions, variables et remises.

PRIX 2026 n'est **pas** la source de vérité.

## Composants

| Fichier | Rôle |
|---------|------|
| `base-material-price-unified.service.ts` | Joint `BaseMaterial` + `BasePrintingPrice` en lignes unifiées |
| `GET /api/admin-backoffice/pricing/base-material-prices` | API liste unifiée |
| `BaseMaterialPricesTable.tsx` | Tableau principal (article, format, face, stock, prix) |
| `MaterialsPricingWorkspace.tsx` | Onglet renommé ; vue legacy « Prix base sans finition » masquée par défaut (`showLegacy`) |

## Colonnes tableau unifié

- Article lié, famille, matière/support, grammage/épaisseur
- Format, largeur, hauteur, face
- Unité commerciale, conversion, unité standard
- Prix achat, prix base impression sans finition
- Stock lié, stock disponible, fournisseur
- Actif, visible POS, impact prix/stock, publication

## Migration / compatibilité

- Données `BaseMaterial` et `BasePrintingPrice` **conservées** ; pas de suppression
- Devis/commandes existants : snapshots inchangés
- Nouveaux devis : structure publiée (`publicationStatus: active`)
- Onglet séparé « Prix base sans finition » retiré de l'UI principale (zéro suppression : accessible via `showLegacy`)

## Lien stock

Chaque ligne peut afficher le stock lié via `getMaterialStockSummary()` et `MaterialLinkedStockSummary`.

Chemin Backoffice : **Administration → Prix personnalisés → Matières & prix de base**
