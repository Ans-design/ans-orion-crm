# Audit — Refonte Prix & règles (Studio Prix & Calculs)

Date : 2026-07-15

## Objectif

Passer d’un écran « catalogue + fiche empilée » à un **Studio Prix & Calculs** avec sous-navigation dédiée, sans casser `pricingResolver` ni les moteurs existants.

## Composants / routes analysés

- `CataloguePrixStockWorkspace.tsx` — hub CPS
- `CatalogStudioNav.tsx` — sidebar Domaines
- `PricingFamilyCards.tsx` — mosaïque + chips (remplacé)
- `AdminHeader.tsx` — Créer / Sync POS
- `article-catalog-page.tsx` + `article-search-bar.tsx` — liste articles
- `pricing-admin.css` — accents rouge
- `pricing-overview.tsx` / `pricing-simulator-panel.tsx` — réutilisés

## Changements livrés

| Avant | Après |
|-------|--------|
| Sidebar Domaines + cartes + chips catégories | Sidebar **masquée** sur `studio=prix` ; **PricingStudioNav** (8 sections) |
| Titre Catalogue + Nouvel / Sync POS | **Studio Prix & Calculs** ; Créer & Sync POS **retirés** de l’en-tête Prix |
| KPI « Catalogue » | KPI « À vérifier » |
| Fiche sous le tableau | **Drawer** latéral |
| Bordure rouge sélection / focus search permanent | Selection soft ; focus gris (rouge uniquement `:focus-visible`) |
| Tabs articles-centric | overview · engines · formulas · articles · tiers · simulation · versions · anomalies |

## Fichiers ajoutés

- `PricingStudioNav.tsx`
- `PricingStudioOverview.tsx`
- `PricingEnginesGallery.tsx`

## Alias conservés (zéro suppression)

Deep-links `tab=isf|flyers|carterie|…|regles|paliers` → moteurs / formules via `PrixMatieresStockWorkspace`.

`PricingFamilyCards` réexporte `PricingStudioNav` pour imports legacy.

## Non livré (limites)

- Éditeur de formule **no-code** complet
- Vue tableur masse « Modifier les tarifs »
- Comparateur de versions avancé
- Page `/pricing/[id]` dédiée (drawer pour l’instant)
- Test Playwright / build CI complets dans ce lot

## Validations

| Check | État |
|-------|------|
| Pas de mocks prix | OK |
| pricingResolver API simulate | Réutilisé tel quel |
| Anciennes commandes | Non touchées |
| ESLint / TS / build full | À lancer après reload local |

## URL

`/administration/catalogue-prix-stock?studio=prix&tab=overview`
