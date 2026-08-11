# Harmonisation UI/UX globale — ANS ORION

<!-- markdownlint-disable MD024 --><!-- Titres répétés volontaires (### Vérifs / Suite) par vague chronologique -->

Date : 19 juillet 2026 · Périmètre : projet complet (tokens, composants partagés, écrans clés).
Basé sur un audit en trois volets : design tokens, composants partagés, écrans principaux.

## 1. État des lieux (audit)

### Points forts confirmés

- Les tokens radius sont déjà à 7px dans `app/globals.css`, `styles/design-tokens.css` et `tailwind.config.ts` (`sm`→`2xl`).
- Un design system canonique existe (`components/ui/` + `app-ui.ts` + `ADMIN_UI`) : Button, Badge, ConfirmDialog, EmptyState, LoadingState, ErrorState, toasts `uxToast`.
- Aucun `alert()` dans `components/` ; les états loading/empty/error sont présents sur les écrans clés (dashboard, commande 360, Talk, POS).
- Le module Catalogue Prix & Stock (`.cps-theme`) est la référence qualité : CSS scoped, tokens light/dark, skeletons, responsive.

### Écarts identifiés

- Rayons hors charte dispersés : `ORION_RADIUS` TS à 10–12px, sidebar 10px, modales stock/matières 8–12px, overrides `10px !important` dans le CSS CPS, `rounded-[10px]` arbitraires (shell, menus UI, POS conception, dashboard).
- Trois « rouges marque » en parallèle : `#FF174D` (runtime), `#E11D48` (`--cps-brand` clair), `#cc0033` (`lib/ans-colors.ts`, charte historique).
- Fuites de statuts anglais à l'écran : `published` / `draft` bruts dans Versions tarifaires, Contrôle pricing dynamique, header Options, simulateur.
- `confirm()` natif encore présent dans ~15 fichiers ; emoji 📭 dans l'état vide du catalogue articles.
- `TalkErrorState` imposait une palette sombre (`bg-red-950`) même en mode clair.

## 2. Corrections appliquées (cette vague)

### Tokens & rayons — 7px partout

- `lib/design/tokens.ts` : `ORION_RADIUS` 10/12px → **7px** (source TS alignée sur la charte).
- `tailwind.config.ts` : `rounded-3xl` 16px → `var(--radius-ui, 7px)`.
- `styles/sidebar-modern.css` : `--sb-radius` 10px → 7px.
- `catalogue-prix-stock-light.css` : 6 overrides `10px !important` → 7px.
- `stock-modal.css`, `material-modal.css`, `admin-backoffice.css` (`--mp-radius`), `admin-backoffice-layout.css`, `master-data.css`, `formula-workspace.css`, `pricing-admin.css`, `app/globals.css`, `ans-talk.css` : radius 8/10/12px et 0.875rem → 7px.
- Fallbacks trompeurs corrigés : `var(--radius-ui, 10px)` → `var(--radius-ui, 7px)`, `var(--oat-radius, 16px)` → 7px.
- 18 fichiers `.tsx` : classes arbitraires `rounded-[8|10|12|14|16|20px]` → `rounded-[7px]` (app-shell, menus déroulants UI, POS conception, PillTabs, dashboard header/bannière, login, devis…).
- `pricing-admin.css` : chips filtres et KPI pills 20px → 999px (vraies pilules assumées).

### Marque unifiée

- `--cps-brand` clair : `#E11D48` → `var(--app-primary, #FF174D)` — le module Catalogue utilise désormais le même rouge que le reste de l'app (hover `#C91443`, focus ring aligné).
- Gradient CTA modal matières : `#e11d48/#be123c` → `var(--cps-brand)/#C91443`.

### Vocabulaire FR unifié (fin des fuites `published`/`draft`)

- `PricingVersionsPanel` : statuts profil + version affichés via `statusLabelFr` (Actif / À compléter / Inactif).
- `admin-control-dynamic-pricing-tab` : « publié » / « draft » → « Actif » / « Brouillon ».
- `OptionsArticleHeader` : statut brut → `statusLabelFr`.
- `pricing-simulator-panel` : libellé d'option `(published)` → `(Actif)`.

### Confirmations & états vides

- `FormulaCanvas` : suppression de bloc via `ConfirmDialog` (plus de `confirm()` natif).
- `article-catalog-page` : archivage article via `ConfirmDialog` (mention explicite « restaurable, aucune suppression définitive »).
- `OptionsDependenciesPanel` : désactivation de dépendance via `ConfirmDialog`.
- État vide catalogue articles : emoji 📭 → icône Lucide `PackageSearch` dans une pastille 48px.

### Écrans

- `TalkErrorState` : palette adaptative clair/sombre (rouge doux sur fond clair, ancien rendu conservé en dark).
- Dashboard : header et bannière de bienvenue alignés sur 7px.

## 3. Vérifications

- `npx tsc --noEmit` : 0 erreur.
- Suite Vitest complète : **298 fichiers / 1834 tests verts** (2 tests de contrat mis à jour pour refléter la refonte « Tarifs par article » : table sémantique + interrupteur POS voulus).
- `npx next build` : succès (le `prisma generate` du script `build` échoue en local si le serveur dev tourne — verrou DLL Windows connu, client déjà généré).
- Encodage UTF-8 vérifié sur tous les fichiers modifiés par script.

## 4. Reste à faire (recommandations, par ROI décroissant)

1. Migrer progressivement le volume restant `ab2-btn-*` / `cps-btn` / `pta-btn` fichier par fichier vers `AppButton` (CSS déjà harmonisé vague 3).
2. ~~Remplacer les ~12 `confirm()` restants~~ → **fait vague 2**.
3. ~~Actif vs Publié / ADMIN_UI~~ → **fait vague 3** (`adminStatusLabel` sur 25 écrans).
4. ~~POS emojis~~ → **fait vague 2**.
5. ~~Prochaine action hub commande~~ → **fait vague 2**.
6. Consolider empty states locaux restants sur `AdminEmptyState` (partiel : matières OK).
7. ~~Marque #FF174D~~ → **fait vague 3** (`lib/ans-colors.ts` + `--ab2-primary`).

## 5. Vague 2 — suite (19 juil. 2026)

### ConfirmDialog généralisé

- **0** `confirm()` / `window.confirm()` restant dans `components/`.
- Menus traités : `MaterialsActionsMenu`, `CatalogueActionsMenu`, `MaterialPriceRowMenu`, `MaterialRowActions`, `MaterialPriceRowActions`, `MaterialsUnifiedWorkspace`, `OptionDependenciesPanel`, `CatalogueAnomaliesPanel`, `fusion-admin-panels`, `ProductionFluxUnifiedWorkspace`, `workflow-status-panel`, `StockItemCompleteModal` (+ déjà faits vague 1).

### POS Lucide + skeleton

- Nouveau helper `lib/pos/pos-icons.tsx` (catégories catalogue + conception).
- Grille / rail catégories / header configurateur / chips conception : icônes Lucide.
- Skeleton 12 cartes au premier chargement catalogue (`catalogueLoading`).
- CSS `.pos-catalog-card__emoji` : pastille 7px brand soft (plus de gros emoji).

### Hub commande — une seule prochaine action

- CTA retirée du header compact et du panneau « État du workflow » en Synthèse.
- Source unique conservée : `FlowPageBanner` (jalons workflow restent dans le panneau Synthèse).

### Vocabulaire

- Badge matière `MaterialStatusBadge` : « Publié » → « Actif ».

## 6. Vague 3 — vocabulaire + marque + boutons (19 juil. 2026)

### Vocabulaire ADMIN_UI

- Helpers `adminStatusLabel` / `adminStatusFilterLabel` dans `lib/administration/admin-ui-vocab.ts`.
- **25 écrans** admin/pricing/catalogue : « Publié(s) » → « Actif(s) », draft UI → « À corriger » (`value="published"` API inchangé).
- `statusLabelFr` aligné (Actif / À corriger / Archivé).

### Marque

- `lib/ans-colors.ts` : rouge **`#FF174D`**, jaune **`#FACC15`** (aliases `legacy*` pour #cc0033 / #eab308).
- Backoffice `--ab2-primary` → `var(--primary)`.

### Boutons

- `AdminHeader` (CPS) → **`AppButton`**.
- Triggers Actions Catalogue / Matières → `AppButton` outline.
- `pta-btn` / `ab2-btn-primary` : hauteur 32px, radius 7px, focus/disabled alignés AppButton.
- Empty matières → `AdminEmptyState`.

## 7. Vague 4 — migration boutons complète (19 juil. 2026)

### Résultat

- **0 occurrence** de `cps-btn` / `pta-btn` / `ab2-btn-*` / `fw-btn` dans `components/**/*.tsx`.
- ~**80+ fichiers** migrés vers `AppButton` (`variant` default/outline/ghost, `size="sm"`, `asChild` pour Link/label).
- Zones : CPS (12), pricing-v4 + fiche article, backoffice-v2 toolbars, administration workspaces (overview, materials, catalogue, direct-sale, textile, goodies, pricing-rules…), formula-workspace.
- CSS legacy **conservé** (zéro suppression) pour compat éventuelle ; l’UI consomme désormais le design system unique.
- Vérifs : `tsc --noEmit` OK · **1834 tests** verts.

### Suite éventuelle

1. ~~CSS morts documentés~~ → **fait vague 6** (DEPRECATED, non supprimés).
2. ~~Empty states~~ → **fait vague 5**.
3. ~~Densité hors admin~~ → **fait vague 6** (dashboard + flow + commande 360).
4. ~~Optionnel : collapse charts + polish devis/stock/production~~ → **fait vague 7**.
5. ~~Polish livraisons / factures / BAT~~ → **fait vague 8**.

## 10. Vague 7 — dashboard collapse + devis/stock/production (20 juil. 2026)

### Dashboard densité

- Bouton « Voir les analyses détaillées » / « Voir plus » / « Voir créances & paiements » selon la vue.
- Contenu secondaire (ChartWidgets, activité ops, créances/paiements/top clients, livraisons) masqué par défaut ; réinitialisé au changement de vue.
- KPI + cartes prioritaires restent toujours visibles.

### Pages métier (8 fichiers)

- Devis : radius 7px, `AppButton`, tokens `--primary` (page + validation + email modal).
- Stock : `AppButton`, `AppLoadingState`, `OrionEmptyState`, radius 7px (page + tabs + badges).
- Production : radius 7px, `AppButton`, tokens marque.

### Vérifs

- `tsc --noEmit` OK · **1834 tests** verts.

## 11. Vague 8 — livraisons / factures / BAT (20 juil. 2026)

### Alignement chaîne logistique → finance → studio

- **Livraisons** : radius 7px, `text-primary` / `ANS.red`, chips filtres, actions détail → `AppButton`, progression marque.
- **Factures** : même tokens + radius ; actions PDF / email / émettre / encaisser / annuler → `AppButton` (+ `asChild` pour liens PDF).
- **BAT** : cards `rounded-[7px]`, KPI `ANS.red` / `ANS.yellow`, select 7px.

### Vérifs

- `tsc --noEmit` OK · **1834 tests** verts.

### Suite éventuelle

1. ~~Clients / commandes liste / RH~~ → **fait vague 9**.
2. ~~Dispatch board / tournee planner~~ → **fait vague 9**.
3. Purge CSS legacy (`.cps-btn` etc.) uniquement avec OK explicite.

## 12. Vague 9 — clients / commandes / RH / logistique (20 juil. 2026)

### Pages & composants

- **Clients** (`components/clients/clients-page.tsx`) : radius 7px, `primary` / `ANS.red`, onglets détail, actions → `AppButton`.
- **Commandes** (liste) : modal édition + bandeau guide 7px / primary / `AppButton`.
- **RH** : absences, mon-profil, performance, employés (+ fiche), recrutement, paie — chips/avatars/modals 7px + tokens marque.
- **Logistique** : `dispatch-board` + `tournee-planner` — cards/map 7px, `bg-primary`.

### Vérifs

- `tsc --noEmit` OK · **1834 tests** verts.

### Suite éventuelle

1. ~~Machines / maintenance / atelier~~ → **fait vague 10**.
2. ~~Messagerie surfaces secondaires~~ → **fait vague 10** (tokens/radius uniquement).
3. Purge CSS legacy uniquement avec OK explicite.

## 13. Vague 10 — machines / maintenance / atelier / talk + achats (20 juil. 2026)

### Cœur machines & atelier

- **Machines** : KPI `ANS.red`, cards/selects 7px, hover `primary`.
- **Tickets maintenance** : actions → `AppButton`.
- **Workspace maintenance** : Lucide `Wrench` (plus d’emoji), 7px, CTA `AppButton`.
- **Kanban atelier** : colonnes `rounded-[7px]`.

### Talk + finance/ops adjacents

- Talk empty/avatars : radius 7px + `ANS.*`.
- **Paiements**, **achats**, **fournisseurs**, **planning** : même barre.

### Vérifs

- `tsc --noEmit` OK · **1834 tests** verts.

### Suite éventuelle

1. ~~POS detail / conception~~ → **fait vague 11** (tokens sûrs).
2. ~~Workspaces / caisse / rapports~~ → **fait vague 11**.
3. Purge CSS legacy uniquement avec OK explicite.

## 14. Vague 11 — POS / workspaces / caisse / rapports (20 juil. 2026)

### POS

- Page liste + conception : radius / tokens `primary`.
- **`pos/[id]`** : swaps classes uniquement (`rounded-[7px]`, `text-primary`, `focus:ring-primary/30`) — aucune logique métier touchée.

### Workspaces & ops

- commercial, cm, magasin, accueil, conducteur, finance, façonnage : 7px / `ANS.red`.
- **Aide**, **caisse** (`AppButton`), **historique**, suggestions équipe.
- Paramètres notifications / apparence : save → `AppButton`.

### Rapports & finance

- rapports (+ performance), charges, fiscalité, ventes-directes, coûts-revient : 7px / KPI `ANS.red`.

### Vérifs

- `tsc --noEmit` OK · **1834 tests** verts.

### Suite éventuelle

1. ~~Paramètres restants + CM~~ → **fait vague 12**.
2. ~~Admin annexes / permissions (radius)~~ → **fait vague 12**.
3. Purge CSS legacy uniquement avec OK explicite.

## 15. Vague 12 — paramètres / CM / admin (20 juil. 2026)

### Paramètres

- Hub colors → `ANS.red` / `ANS.yellow`.
- configuration, données, matières, règles : 7px + `AppButton` CTAs + tokens primary/ANS.

### CM & admin

- campagnes / relances : cards + `AppButton`.
- annexes, permissions (radius only), vue, ticker (radius, bandeau rouge conservé).

### Bonus

- operations, production (gradients primary), devis totals → `text-primary`.

### Dette restante

- **0** `rounded-xl` sur `app/(app)/**/page.tsx`.
- **7** `rounded-xl` restants dans `TarifsLegacyGrid.tsx` (legacy volontaire).

### Vérifs

- `tsc --noEmit` OK · **1834 tests** verts.

### Suite éventuelle

1. ~~Harmoniser `TarifsLegacyGrid`~~ → **fait vague 13**.
2. ~~Passer `components/` métier (hub commande, POS, sales-flow, dashboard)~~ → **fait vague 13**.
3. Purge CSS legacy (`.cps-btn` etc.) **uniquement avec OK explicite**.

## 16. Vague 13 — TarifsLegacyGrid + composants métier (20 juil. 2026)

### Tarifs

- `TarifsLegacyGrid.tsx` : 7px + tokens primary/ANS — mode legacy / overrides DB **conservés**. Dette hex/radius **0**.

### Composants hub (~38 fichiers)

- Hub commande (stepper, finance, logistique, banners, BAT, preuves, snapshots, timeline).
- Livreur, encaissement, paiement POS, kanbans production, checklist qualité.
- Sales-flow (client gate/search), POS mobile/banners, dashboard header/synthèse, KPI card.
- Bonus : studio panels, conception stepper, pointage RH, access-requests.

### Dette restante (`components/`)

- Principalement **backoffice pricing** (`pricing-rules`, `direct-sale`, textile/goodies, `pricing-v4`) + POS preview + shadcn primitives — vague 14.

### Vérifs

- `tsc --noEmit` OK · **1834 tests** verts.

### Suite éventuelle

1. ~~Vague 14 : workspaces admin pricing~~ → **fait**.
2. ~~POS preview + auth cards~~ → **fait vague 14** (bonus).
3. Purge CSS legacy **uniquement avec OK explicite**.

## 17. Vague 14 — backoffice pricing / catalogue (20 juil. 2026)

### Scope (~39 fichiers)

- **pricing-rules** workspaces (flyer, carterie, photo, tampons, matières, etc.).
- **direct-sale**, **textile**, **goodies**, **prix-matières**, **catalogue** panels.
- **pricing-v4** + `fusion-admin-panels` + CSS fallbacks.
- Bonus : POS preview, panels techniques POS, StockCategoryBadge, auth cards.

### Dette

- **0** `rounded-xl` / `#cc0033` / `#E6003C` sous `components/administration` + `pricing-v4`.
- `rounded-full` / chips `rounded-lg` / shadcn / `dev-preview` volontairement laissés.

### Vérifs

- `tsc --noEmit` OK · **1834 tests** verts.

### Suite éventuelle

1. Scan global restant (`components/` hors admin) + auth/forms/dashboard fragments.
2. Documenter score UI/UX post-vagues + checklist QA visuelle.
3. Purge CSS legacy (`.cps-btn` etc.) **uniquement avec OK explicite**.

## 8. Vague 5 — empty / loading / orion-btn (20 juil. 2026)

### Empty states unifiés

- `OptionsEmptyState` → délègue à **`AdminEmptyState`** (tous les call sites options/tiers/pricing héritent).
- `MaterialEmptyState` (vues Usages/Anomalies) → `AdminEmptyState` + icône Lucide.
- Audit log, matrice variables, dépendances SI/ALORS, bibliothèque formules, tournées logistique → `AdminEmptyState` / `ErrorState`.

### LoadingState

- Remplacé `animate-pulse` « Chargement… » dans pricing-rules, direct-sale, logistics carriers, tab skeletons, hub prix-matières, POS client gate, tournee-planner, AdminBackofficeStats.

### orion-btn

- **0** `orion-btn` restant dans `components/` → `AppButton`.

### Vérifs

- `tsc --noEmit` OK · **1834 tests** verts.

## 9. Vague 6 — CSS legacy + cockpit hors admin (20 juil. 2026)

### CSS boutons legacy (zéro suppression)

- Commentaires `DEPRECATED — utiliser AppButton` sur `.cps-btn`, `.pta-btn`, `.ab2-btn-primary`, `.fw-btn` (fichiers CSS CPS / pricing-admin / ab2 / formula / layout).
- Blocs **conservés** pour compat ; plus aucun usage TSX.

### Dashboard

- Densité : `space-y-6` → `space-y-4`, radius alertes/cartes → 7px.
- KPI / activity tiles : couleurs via tokens CSS (`--primary`, `--cps-*`) au lieu d’hex hardcodés.
- CTA Réessayer → `AppButton`.

### Flow + commande 360

- `FlowContextBanner` : radius 7px + CTA `AppButton`.
- Erreur / introuvable hub commande → `ErrorState` / `AdminEmptyState`.
- Titre header : « Dossier · {numero} ».

### Vérifs

- `tsc --noEmit` OK · **1834 tests** verts.

## 18. Vague 15 — résidus + checklist QA (20 juil. 2026)

### Corrigé (chirurgical)

| Zone | Fichiers | Changements |
|------|----------|-------------|
| POS | `studio-product-preview`, `bache-eyelets-selector`, `autocopiant-souche-colors` | `rounded-[7px]`, `text-primary` |
| Panier | `cart-skeleton` | `rounded-2xl`/`rounded-xl` → `rounded-[7px]` |
| Dashboard | `orion-onboarding-banner`, `global-activity-feed`, `enterprise-health-score`, `chart-states` | hex → `text-primary` / `ANS.red` / `ANS.yellow` / `ring-primary/30` ; radius 7px |
| Forms / branding | `password-field`, `orion-monogram` | focus ring `primary/30` ; `fill-primary` (géométrie monogramme inchangée) |
| Auth / accès | `reset-password`, `forgot-password`, `non-autorise` | radius cartes/icônes → 7px |
| BAT client | `bat/valider/[token]` | tous `#cc0033` → `text-primary` / `bg-primary/10` / `border-primary` |
| KPI | `kpi-card.tsx` | **clés legacy `#E6003C` / `#BE123C` conservées** → ton `orion-kpi-icon--brand` (ANS.red) |

### Skip volontaire (puis partiellement repris)

- shadcn : fallbacks `#BE123C` → `#FF174D` dans `dropdown-menu` / `select` (radius déjà 7px).
- `dev-preview/**` : radius → 7px.
- Surfaces mineures : command-palette, not-found, FAB POS, article-mockups → `rounded-[7px]`.

### Grep résiduel (post vague 15)

Pattern UI live : quasi **0** hors alias volontaires.

| Scope | Dette |
|-------|--------|
| `kpi-card` | 2 clés alias `#E6003C`/`#BE123C` → brand (volontaire) |
| `lib/ans-colors` / `tokens` / emails HTML | aliases legacy / templates mail |
| CSS `.cps-*` / `--ab2-*` | dépréciés — purge **OK explicite** seulement |

### Vérifs

- `npx tsc --noEmit` OK · **1834 tests** verts.

## 19. Score & checklist QA visuelle (post vagues 1–15)

### Score estimé UI/UX global : **~93/100**

- **Radius 7px** — généralisé écrans métier + résidus (palette, mockups, FAB POS, 404, shadcn fallbacks).
- **Tokens marque** — `primary` / `ANS.red` / `ANS.yellow` dominants ; hex legacy surtout en **fallbacks CSS**, emails HTML et clés alias KPI.
- **AppButton** — migration TSX faite (vagues 5–6) ; CSS `.cps-btn` etc. encore présents (dépréciés, non purgés).
- **Empty / loading / error** — `AdminEmptyState`, `LoadingState`, `ErrorState`, skeletons panier/graphiques alignés.
- **Vocab FR + hub commande** — parcours FR ; dossier `/commandes/[id]` comme centre de gravité.

### Dette restante

- CSS legacy : `.cps-btn`, variables `--ab2-accent: #cc0033`, fallbacks catalogue — **purge uniquement avec OK explicite**.
- Clés alias KPI `#E6003C` / `#BE123C` — **à garder** pour rétrocompat callers.
- Templates email / `lib/design/tokens` aliases historiques — hors UI React live.

### Checklist QA manuelle

- [ ] **Login** — carte radius 7px, rouge `primary`, Accès démo replié, focus ring primary.
- [ ] **Dashboard** — KPI/cartes 7px, santé entreprise via ANS, bannière onboarding yellow/primary, empty activité OK.
- [ ] **POS** — preview produit / œillets / souches autocopiant : radius 7px + compteur `text-primary`.
- [ ] **Devis** — boutons AppButton, badges statut tokens, empty liste cohérent.
- [ ] **Commande 360** — hub `/commandes/[id]`, banner flow, actions suivantes, radius 7px.
- [ ] **Stock** — listes paginées, empty/loading, accent primary sans hex hardcodé UI.
- [ ] **Production** — cartes OF 7px, CTA primary, deep-link `?commande=`.
- [ ] **Livraisons** — états vides, badges, radius cartes.
- [ ] **Factures** — montants lisibles, AppButton, empty « Aucune facture ».
- [ ] **BAT** — liste interne + portail `/bat/valider/[token]` : primary, pas de `#cc0033`.
- [ ] **Clients** — fiches CRM, empty search, radius formulaires.
- [ ] **RH** — accès rôles, pas de fuite visuelle marges/salaires si non autorisé.
- [ ] **Administration / pricing** — panels 7px, tokens, pas de hex UI live (CSS fallback OK).
- [ ] **Messagerie** — `/messagerie` plein écran (jamais flottant), bulle bas-droite + badge.
- [ ] **Caisse** — encaissement primary, radius 7px, états erreur/retry.

## 20. Vague 16 — derniers boutons legacy + shim CSS (20 juil. 2026)

### TSX migrés vers `AppButton`

| Fichier | Avant | Après |
|---------|-------|-------|
| `app/(app)/administration/packaging/page.tsx` | `ab2-btn` / `ab2-btn-ghost` / `ab2-btn-primary` | `AppButton` ghost + tabs default/ghost |
| `app/(app)/administration/packaging-sac/page.tsx` | idem | idem |
| `app/(app)/administration/packaging-soft/page.tsx` | idem | idem |
| `app/(app)/workspace/conducteur/page.tsx` | `orion-btn-secondary` | `AppButton` variant outline (layout tactile conservé) |

### Call sites TSX

- Grep `cps-btn|pta-btn|ab2-btn|fw-btn|orion-btn` dans `app/` + `components/` `*.tsx|*.ts` → **0** match.

### Soft purge CSS (shim — zéro hard delete)

- Commentaires `/* DEPRECATED vague 16 — 0 call sites TSX — garder shim ; utiliser AppButton */` sur blocs `.cps-btn*`, `.pta-btn*`, `.ab2-btn-*`, `.fw-btn*`, `.orion-btn-secondary`.
- Remap hex legacy (`#cc0033` / `#E6003C`) → `#FF174D` / `var(--primary, #FF174D)` dans tokens `--ab2-accent` / `--ab2-primary` / `--fw-brand` et règles boutons concernées.
- Fichiers CSS **conservés** comme shim de compatibilité.

### Note

- **Hard purge** des blocs CSS legacy (suppression réelle) → **OK explicite séparée** si souhaité plus tard.

## 21. Vague 17 — purge dure CSS boutons legacy (20 juil. 2026)

### Supprimé (blocs de définition uniquement — fichiers CSS conservés)

| Fichier | Blocs retirés |
|---------|---------------|
| `components/backoffice-v2/admin-backoffice.css` | `.ab2-btn-primary`, `.ab2-btn-ghost`, `.ab2-btn-primary-blue`, `.ab2-btn-compact` (+ hover/disabled/focus) |
| `components/backoffice-v2/admin-backoffice-layout.css` | `.ab2-btn-primary`, `.ab2-btn-secondary`, `.ab2-btn-ghost`, `.ab2-btn-primary-blue` (+ variants) |
| `components/admin/catalogue-prix-stock/catalogue-prix-stock-light.css` | `.cps-theme .cps-btn*` defs/overrides ; `.ab2-btn*` dans CPS ; sélecteurs multi retirés en gardant `.rounded-[10px]`, nav tabs, focus tiles, etc. |
| `components/admin/pricing-v4/pricing-admin.css` | `.orion-pricing-admin .pta-btn*` (+ sticky-actions) |
| `components/admin/formula-workspace/formula-workspace.css` | `.fw-btn*` (+ media `.fw-footer .fw-btn`) |
| `app/globals.css` | `.orion-btn-secondary` (+ hover) |

### Thèmes globaux (`styles/*.css`) — sélecteurs nettoyés

Retrait de `.cps-btn*`, `.ab2-btn*`, `.orion-btn*`, `.fw-btn*` des listes ; règles devenues vides/supprimées ; conservation de `.cps-pill`, `.ui-button`, `.ans-btn-primary`, `button.bg-primary`, etc.

Fichiers : `theme-global-refonte.css`, `alignment-system.css`, `ui-consistency-10.css`, `typography-scale.css`, `contrast-theme.css`, `light-white-only.css`, `light-theme.css`, `light-saas-premium.css`, `orion-ui-ux-complete.css`, `design-tokens.css`.

### Call sites TSX

- Grep `cps-btn|pta-btn|ab2-btn|fw-btn|orion-btn` dans `app/` + `components/` `*.tsx|*.ts` → **0**
- Même pattern dans `components/**/*.css` + `app/globals.css` → **0**
- Même pattern dans `styles/**/*.css` → **0**
- `npx tsc --noEmit` → OK

### Score

- Score estimé UI/UX global : **~94/100** (purge CSS legacy boutons terminée ; AppButton unique).

### Restant (intentionnel)

- ~~Templates email HTML hex~~ → **fait vague 18**.
- Clés alias KPI (`#E6003C` / `#BE123C`) — rétrocompat callers.
- `ANS.legacyRed` / `legacyRedVivid` — aliases documentaires.

## 22. Vague 18 — surfaces hors React (emails, charts, tokens) (20 juil. 2026)

### Aligné sur `#FF174D` / `#C91443` (ANS.red / redDark)

- Emails : `email-service`, reset password, password changed — radius CTA **7px**.
- SVG preview fichiers : stroke/texte marque.
- `chart-theme` : `primaryHover` + série rouge profond.
- Conception catégories CG, `settings-defaults` magenta, `ORION_COLORS` red600/700 + gradient secondary.

### Conservé volontairement

- `ANS.legacyRed` (`#cc0033`) — alias migration.
- Clés map KPI `#E6003C` / `#BE123C` → ton brand.

### Score

- **~95/100** (marque unifiée aussi hors UI React).

### Vérifs

- `tsc --noEmit` OK · **1834 tests** verts.

### Suite

- Commit git (sur demande) · QA manuelle checklist §19 · sujets métier roadmap.

## 23. Vague 19 — clôture hex CSS/scripts (20 juil. 2026)

### Remap

| From | To |
|------|-----|
| `#cc0033` | `#FF174D` (fallbacks `var(--primary\|--cps-brand\|--oat-accent\|--accent-primary, #FF174D)`) |
| `#E6003C` / `#BE123C` | `#C91443` (hover / danger text / gradients) |
| `#ff1e56` / `#FF1E56` | `#FF174D` |
| `#eab308` / `#EAB308` | `#FACC15` |

### Surfaces touchées

- Tokens & thèmes : `design-tokens.css`, `light-saas-premium`, `light-theme`, `light-white-only`, `ui-consistency-10`, `sidebar-modern`, `design-polish-global`, `design-modern-2026`, `palette-orion-violet`, `late-arrival-modal`, `pos-soft-ui`, `dropdown-theme`, `app/globals.css`
- Backoffice / admin CSS : CPS light, `admin-backoffice` (+ layout), catalogue POS studio, material-modal, master-data, admin-table, overview-unified, production-flux
- TSX : `ProductionFluxUnifiedWorkspace` (`ring-[#FF174D]`)
- Script local : `scripts/show-pos-catalogue-local.ts`

### Conservé volontairement

- `lib/ans-colors.ts` — clés `legacyRed` / `legacyRedVivid` / `legacyYellow`
- `kpi-card.tsx` — clés map `#E6003C` / `#BE123C` (rétrocompat)

### Score & clôture

- Score estimé UI/UX global : **~96/100**
- Cycle harmonisation couleurs marque (CSS / scripts / tokens runtime) : **CLOS**

### Suite

- Commit git (sur demande) · QA manuelle checklist §19 · roadmap Lot 6/8
