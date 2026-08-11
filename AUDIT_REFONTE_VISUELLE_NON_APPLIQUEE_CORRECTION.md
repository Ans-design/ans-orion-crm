# AUDIT — Refonte visuelle non appliquée → Correction

**Date :** 2026-07-11  
**Module :** Administration → Catalogue, Prix & Stock (`/administration/catalogue-prix-stock`)  
**Périmètre :** UI / UX / layout / thème uniquement — **aucune** modification Prisma, APIs, formules, sync, pricingResolver.

---

## 1. Problème constaté

La page CPS apparaissait comme une **maquette claire centrée** (panneau blanc) dans le shell ERP :

| Symptôme | Cause |
|---|---|
| Grand panneau blanc centré | Classes `bg-white`, shell ex-`cps-light`, cards Tailwind claires |
| Vide latéral | `max-w-[1800px] mx-auto` sur page + workspace |
| Mix dark / light | Contenu light dans AppShell sombre + Hub legacy |
| Double chrome | `AdministrationHubLayout` (titre + body) **autour** du vrai workspace CPS |
| Accents rouge/or absents | Tokens brand non portés sur KPI / tabs / boutons |

---

## 2. Composants / wrappers encore « panneau blanc »

| Fichier | Problème |
|---|---|
| `app/(app)/administration/catalogue-prix-stock/page.tsx` | `max-w-[1800px] mx-auto` |
| `CataloguePrixStockWorkspace.tsx` | `mx-auto flex max-w-[1800px]` |
| `catalogue-prix-stock-light.css` | Thème light (renommé sémantiquement → `.cps-theme` dark) |
| `AnomalyCenter.tsx` | Carte `bg-white border-gray-200` |
| `EntityDrawer.tsx` | Drawer `bg-white` |
| `ReapproExpressBar.tsx` | Bandeau `bg-white` |
| `AdminSidebar.tsx` | Sidebar `bg-white` (optionnelle) |
| `ExcelManager.tsx` | Bandeau `bg-blue-50` / textes gris |
| `SmartDataGrid.tsx` | Toolbar / thead `bg-gray-50`, hover bleu clair |
| `PrixMatieresStockWorkspace.tsx` (panel contexte) | Card `bg-white` |
| `lib/administration/admin-legacy-context.ts` | CPS passait encore par Hub legacy → double header / body |

---

## 3. Fichiers corrigés

- `components/admin/catalogue-prix-stock/catalogue-prix-stock-light.css` → tokens dark + overrides anti-blanc
- `components/admin/catalogue-prix-stock/AdminCatalogueShell.tsx` → `.cps-theme` full-width bleed
- `components/admin/catalogue-prix-stock/AdminHeader.tsx` (déjà dark)
- `components/admin/catalogue-prix-stock/KpiCards.tsx` (déjà dark)
- `components/admin/catalogue-prix-stock/PillTabs.tsx` (déjà dark)
- `components/admin/catalogue-prix-stock/AnomalyCenter.tsx`
- `components/admin/catalogue-prix-stock/EntityDrawer.tsx`
- `components/admin/catalogue-prix-stock/ReapproExpressBar.tsx`
- `components/admin/catalogue-prix-stock/AdminSidebar.tsx`
- `components/admin/catalogue-prix-stock/ExcelManager.tsx`
- `components/admin/catalogue-prix-stock/SmartDataGrid.tsx`
- `components/administration/catalogue-prix-stock/CataloguePrixStockWorkspace.tsx`
- `app/(app)/administration/catalogue-prix-stock/page.tsx`
- `components/administration/prix-matieres-stock/PrixMatieresStockWorkspace.tsx` (card contexte)
- `lib/administration/admin-legacy-context.ts` (bypass Hub pour CPS)
- `styles/theme-global-refonte.css` (alias `.cps-theme`)

**Non touchés (volontairement) :** Prisma, routes API, sync POS, pricingResolver, catalogOptionsSyncService, imports Excel métier.

---

## 4. Tokens couleurs appliqués (scope `.cps-theme`)

| Token | Valeur |
|---|---|
| `--cps-bg` / `--ans-bg` | `#070b18` |
| `--cps-bg-soft` / `--ans-bg-soft` | `#0b1222` |
| `--cps-surface` / `--ans-surface` | `#101827` |
| `--cps-surface-2` / `--ans-surface-2` | `#162033` |
| `--cps-border` / `--ans-border` | `rgba(255,255,255,0.08)` |
| `--cps-title` / `--ans-text` | `#f8fafc` |
| `--cps-muted` / `--ans-muted` | `#94a3b8` |
| `--cps-brand` / `--ans-primary` | `#ef174f` |
| `--cps-brand-hover` / `--ans-primary-hover` | `#ff2d5f` |
| `--cps-gold` / `--ans-gold` | `#facc15` |
| `--cps-amber` / `--ans-amber` | `#f59e0b` |
| `--cps-danger` / `--ans-danger` | `#ef4444` |
| `--cps-success` / `--ans-success` | `#22c55e` |

---

## 5. Wrappers supprimés / neutralisés

- `max-w-[1800px]` + `mx-auto` (page + workspace)
- Shell light / panneau blanc centré
- Passage CPS dans `AdministrationHubLayout` (double chrome)
- Overrides CSS : `bg-white`, `bg-gray-50*`, `container`, `max-w-*` abusifs, `mx-auto` dans `.cps-theme`

Remplacés par : `w-full max-w-none`, fond `--cps-bg`, panels `--cps-surface`.

---

## 6. Pages / surfaces refondues

- Page réelle `/administration/catalogue-prix-stock` (pas de maquette / iframe / mock)
- KPI cards sombres + accents or / ambre / rouge
- Tabs pills actives rouge premium
- Tables SmartDataGrid dark
- Drawer / anomalies / Excel / réappro dark
- Workspaces embarqués (Catalogue POS, Prix & Stock) via overrides `.cps-theme`

---

## 7. Tests visuels (checklist)

| # | Critère | Statut |
|---|---|---|
| 1 | Plus de grand panneau blanc centré | OK (code) — à confirmer F5 navigateur |
| 2 | Full-width utile | OK |
| 3 | Fond sombre premium | OK |
| 4 | Accents rouge / jaune | OK |
| 5 | Cohérence sidebar AppShell + page | OK partiel (page CPS unifiée ; AppShell suit le thème utilisateur) |
| 6 | KPI sombres | OK |
| 7 | Tabs sombres | OK |
| 8 | Tableaux sombres | OK |
| 9 | Boutons lisibles | OK |
| 10 | Textes lisibles | OK |
| 11 | Vides inutiles réduits | OK |
| 12 | F5 stable | À valider en local |
| 13 | Données réelles préservées | OK (UI only) |
| 14 | POS sync intact | OK (handlers inchangés) |

---

## 8. Avant / après (checklist capture)

**Avant**
- [ ] Bloc blanc centré type maquette
- [ ] Marges / max-width visibles
- [ ] KPI / tabs / tables clairs
- [ ] Double titre (Hub + AdminHeader)

**Après**
- [ ] Contenu edge-to-edge dans la zone main
- [ ] Surfaces `#070b18` / `#101827`
- [ ] Tabs actives `#ef174f`, icônes or
- [ ] Un seul header module (AdminHeader)
- [ ] Données KPI / onglets / sync POS toujours branchés

---

## 9. Critère final

Validé côté code si la page CPS est une **interface ERP dark premium rouge/jaune full-width**, sans panneau blanc central, sans max-width centré, sans perte de logique métier.

**Action utilisateur recommandée :** hard refresh (`Ctrl+F5`) sur `http://127.0.0.1:3020/administration/catalogue-prix-stock`.
