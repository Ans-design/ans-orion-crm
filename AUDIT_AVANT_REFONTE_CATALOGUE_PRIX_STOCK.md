# AUDIT AVANT REFONTE — Catalogue, Prix & Stock

Date : 2026-07-14  
Périmètre : Administration > Catalogue, Prix & Stock (ANS ORION)  
Source prompt : `ULTRA_PROMPT_REFONTE_TOTALE_ADMIN_CATALOGUE_PRIX_STOCK_ANS_ORION.txt`

## 1. Centre de gravité actuel

- **Hub canonique** : `/administration/catalogue-prix-stock`
- **Workspace** : `components/administration/catalogue-prix-stock/CataloguePrixStockWorkspace.tsx`
- **Nested** : `PrixMatieresStockWorkspace` (matières / prix contexte / stock / familles tarif)
- **UI kit** : `components/admin/catalogue-prix-stock/*`

## 2. Problèmes UX constatés

1. ~19 onglets horizontaux + 2e barre dans PMS → surcharge cognitive.
2. Double hub (CPS embarque PMS) + pages standalone qui dupliquent (`flyer-regles`, `impression-sf`, packaging…).
3. Archives / corbeille / historique faibles (placeholder historique).
4. KPI partiels (`—` fréquents) ; drawer KPI sans création réelle.
5. Goodies / Textile / Packaging hors onglets principaux (micro-nav dispersée).
6. Import Excel multi-feuilles partiel selon onglet.

## 3. Données & moteurs — À PRÉSERVER (zéro modification calcul)

| Domaine | Orchestrateur / moteur | Acceptation figée |
|---------|------------------------|-------------------|
| Calcul POS | `lib/pricing/calculate.ts` | — |
| ISF | `impression-sf-pricing.ts` | formats A4… / RV |
| Flyer | `flyer-pricing.ts` | ISF + plis |
| Carterie | `carterie-pricing.ts` | **670 Ar**/pièce |
| Boîte | `packaging-box-price.ts` | **50 400 Ar** |
| Sac papier | `paper-bag-price.ts` | **50 400 Ar** |
| Doypack / Gobelet | soft packaging | **1 425 Ar** |
| Étiquette | `precut-label-price.ts` | 10 000 / 12 000 Ar |
| Hangtag | `hangtag-price.ts` | ISF / pièces + acc. |

**Interdit** : casser `pricingResolver`, seed auto après suppression, mocks prix React, `setTimeout` pour sync.

## 4. Tables Prisma à ne pas lossy-migrater

`BaseMaterial`, `MaterialContextPrice`, `BasePrintingPrice`, `StockItem`/`StockMovement`, `FinishingPrice`, `GrandFormatPricing`, `DirectSale*`, packaging (`Packaging*`, `PaperBag*`, `Doypack*`, `Cup*`, `Hangtag*`, `PrecutLabel*`), Textile/Goodies.

## 5. Routes legacy (rediriger, ne pas supprimer)

Voir `lib/administration/backoffice-redirects.ts` + pages `*-regles`, packaging*, finitions, synchronisation.

## 6. Décision de refonte

**Priorité** = organisation / UI / studios no-code.  
**Non-priorité** = réécrire les formules.  
Snapshot + tests de régression **avant** toute modification moteur.

## 7. Cible architecture (8 studios)

1. Cockpit · 2. Articles POS · 3. Matières & Stocks · 4. Prix & Calculs · 5. Finitions · 6. Import/Export · 7. Anomalies · 8. Historique

Détail : `CATALOGUE_ADMIN_REFACTOR_PLAN.md`
