# Audit design global ANS ORION — Plan en 10 étapes

> **Date :** juillet 2026  
> **Périmètre :** application complète (SaaS CRM / ERP / GPAO / POS)  
> **Références :** `styles/design-tokens.css`, `lib/design/*`, `components/ui/*`, audit Vercel `docs/VERCEL_AUTH_AUDIT.md`

---

## Synthèse exécutive

ANS ORION dispose déjà d’une base solide : tokens couleur, mode clair corrigé, sidebar hiérarchisée, composants `App*` centralisés, grilles dashboard 12 colonnes, couche UX (`lib/ux/`). Le travail restant est **l’harmonisation globale** : même rayon, même rythme, même typographie, moins de styles ad hoc par module.

| Étape | Statut | Priorité |
|-------|--------|----------|
| 1. Audit | ✅ Ce document | — |
| 2. Inspirations | ✅ Section ci-dessous | — |
| 3. Direction artistique | ✅ `lib/design/design-direction.ts` | P0 |
| 4. Design system | ✅ `styles/design-system.css` + radius 10px | P0 |
| 5. Couleurs / contrastes | ✅ `styles/contrast-theme.css` | P1 |
| 6. Grilles / espaces | ✅ `layout-grid.css` + `dashboard-kpi-grid` | P1 |
| 7. Typographie | ✅ `PageHeader` / `SectionHeader` / `EmptyState` → `orion-ds-*` | P1 |
| 8. UX / micro-animations | ✅ `ux-interactions.css` réimporté + `orion-ux-*` | P2 |
| 9. Polissage modules | ✅ Dashboard, POS, RH/tâches, `ModuleShell` | P2 |
| 10. Test final | ✅ `docs/FINAL_DESIGN_10_STEPS_REPORT.md` | P3 |

---

## ÉTAPE 1 — Audit design par zone

### 1.1 Dashboard / Cockpit

| Problème | Gravité | Détail |
|----------|---------|--------|
| Titres hétérogènes | Moyen | « Cockpit Principal » vs anciens libellés « Tableau de bord » |
| Grille analytics | Moyen | Spans 12 colonnes OK mais certaines cartes hauteurs inégales au chargement |
| KPI | Faible | Mélange `KpiCard` / tuiles custom / `text-[10px]` |
| Graphiques | Faible | Recharts OK ; états vides parfois génériques |
| Mode clair | Faible | Corrigé récemment ; surveiller textes secondaires charts |

**Priorité module :** P1

### 1.2 CRM Clients

| Problème | Gravité | Détail |
|----------|---------|--------|
| Densité fiche | Moyen | Vue table + profil + cartes ; beaucoup d’info, hiérarchie dense |
| Actions ligne | Faible | `AppTableRowActions` OK ; cohérent avec design system |
| Formulaire création | Moyen | Champs NIF / validation ; espacement formulaire variable |
| Recherche | Faible | Ctrl+K + filtre local OK |

**Priorité module :** P1

### 1.3 Catalogue POS

| Problème | Gravité | Détail |
|----------|---------|--------|
| Chips catégories | Moyen | `rounded-md` / `rounded-xl` mélangés |
| Bannière client | Faible | `SalesClientBanner` bien isolée |
| Configurateur | Moyen | États 0/N OK ; styles inline résiduels sur équipe/tâches proches |
| Preview draft | Faible | Bannière amber cohérente |

**Priorité module :** P1

### 1.4 Panier / Devis

| Problème | Gravité | Détail |
|----------|---------|--------|
| Cartes lignes | Moyen | `cart-item-card` vs `bg-card` générique |
| Totaux | Faible | `tabular-nums` présent mais pas partout |
| Devis liste | Moyen | Filtres + tableau dense ; badges statut à harmoniser |
| Paiement guidé | Moyen | Flow UX amélioré ; visuel encore hétérogène |

**Priorité module :** P1

### 1.5 Commandes / Production / GPAO

| Problème | Gravité | Détail |
|----------|---------|--------|
| Fiche 360° | Moyen | Nombreux sous-panneaux (`order-*`) — risque card-in-card |
| Kanban | Faible | Couleurs statut OK |
| Stepper production | Faible | Nouveau ; à aligner sur tokens |
| Planning Gantt | Moyen | `rounded-lg` local, pas tokens |

**Priorité module :** P2

### 1.6 ANS Talk

| Problème | Gravité | Détail |
|----------|---------|--------|
| Styles dédiés | Moyen | `ans-talk.css` + classes `talk-*` — parallèle au DS global |
| Bulle flottante | Faible | z-index documenté (`ORION_Z.talkBubble`) |
| 3 zones layout | Faible | Structure type Messenger OK |

**Priorité module :** P2

### 1.7 Backoffice / Administration

| Problème | Gravité | Détail |
|----------|---------|--------|
| Legacy pricing CSS | Moyen | `pricing-admin.css` + workspace — double couche |
| Onglets nombreux | Moyen | Densité élevée, toolbar chargée |
| Sync / publication | Faible | `SyncStatusLine` ajoutée |

**Priorité module :** P2

### 1.8 Finance / Stock / Logistique / RH

| Problème | Gravité | Détail |
|----------|---------|--------|
| Tableaux | Moyen | Mix `DataTable` / tables manuelles |
| RH paie | Faible | Formulaires denses |
| Livraisons | Faible | Cartes + carte map — OK |

**Priorité module :** P2

### 1.9 Shell global (sidebar, topbar, modales)

| Zone | État | Problèmes |
|------|------|-----------|
| Sidebar ouverte | Bon | Hiérarchie parent/enfant corrigée ; univers actif rouge modéré |
| Sidebar réduite | Bon | Flyout portal ; mini rail opérationnel |
| Topbar | Bon | Recherche, thème, notifs ; `aria-label="Thème"` |
| Modales / drawers | Moyen | shadcn `rounded-lg` — aligner sur 10px token |
| Breadcrumb | Bon | `AutoBreadcrumb` présent |

### 1.10 Problèmes transversaux

#### Visuels & incohérences UI
- **Rayons :** 7px tokens vs `rounded-lg` / `rounded-xl` / `rounded-2xl` dispersés (~200+ occurrences Tailwind)
- **Cartes :** `CardTitle` en `text-2xl` trop grand pour cartes module
- **Couleurs inline :** styles `style={{ background: '#22c55e22' }}` dans équipe/tâches
- **ANS Talk :** feuille CSS séparée

#### UX
- Guidage « prochaine action » présent sur commandes ; à généraliser
- Toasts unifiés (`lib/ux/feedback.ts`) — migration partielle
- Empty states : composant `EmptyState` OK ; adoption inégale

#### Grille & espacement
- `dashboard-grid` 12 col + `gap-4` : bon standard
- `ModuleShell` / `PageContainer` : adoption ~60% des pages
- Padding cartes : `p-4` vs `p-6` shadcn Card

#### Contraste (mode clair)
- Corrigé : `--text-main`, badges sémantiques `--success-text`, etc.
- Reste : `text-muted-foreground` shadcn parfois trop clair sur `--bg-card-soft`
- Ghost buttons : renforcés dans `button.tsx` mais à surveiller

#### Typographie
- Police : **Manrope** (sans) + **JetBrains Mono** (codes) — bon choix
- `TYPO` tokens dans `lib/design/typography.ts` — sous-utilisés
- Titres page : `PageHeader` cohérent ; pages legacy avec `h1` custom

#### Composants à harmoniser (priorité)
1. `Card` / `CardTitle` / paddings
2. `Button` variants (ghost, secondary)
3. `Badge` / `StatBadge`
4. `KpiCard` / `KpiGrid`
5. `DataTable` + `AppFilterBar`
6. `EmptyState` / `LoadingState` / `ErrorState`
7. Sidebar items (`orion-nav-*`)
8. ANS Talk (`talk-*` → tokens)

---

## ÉTAPE 2 — Inspirations retenues et principes adaptés

> Analyse qualitative des références demandées — **aucune copie directe**.

### Sources & enseignements

| Référence | Principes retenus pour ANS ORION |
|----------|----------------------------------|
| **Linear** | Navigation latérale dense, hiérarchie typographique stricte, peu d’ombres, états actifs subtils |
| **Stripe Dashboard** | KPI en grille, montants `tabular-nums`, tableaux aérés, feedback transactionnel |
| **Shopify Admin** | Parcours commercial clair, toolbar module, filtres persistants |
| **Notion / Airtable** | Surfaces blanches mode clair, bordures fines, contenu respirant |
| **HubSpot / Flux CRM** | Pipeline visuel (kanban commandes), fiche client 360° |
| **Odoo / ERPNext** | Densité métier acceptable si hiérarchie forte ; pas de rouge dominant |
| **AdminLTE / DashStack** | Sidebar + topbar classiques — reprendre structure, pas le style daté |
| **Intercom / ANS Talk** | 3 colonnes messagerie, contexte métier latéral |
| **Material / Apple HIG** | Touch targets 40px+, focus visible, contrastes AA visés |
| **Webflow / Behance / Dribbble** | Cartes premium, dégradés ANS maîtrisés, pas de surcharge glassmorphism |

### Principes adaptés ANS ORION

1. **Premium opérationnel** — beau mais lisible en atelier 8h/jour  
2. **Rouge = action & marque** — pas fond de navigation enfant  
3. **Bleu nuit** (dark) / **blanc cassé** (light) — jamais `#000` / gris froid générique  
4. **Une grille, un rayon (10px), un rythme (gap-4)**  
5. **Typo : 3 niveaux** — page / section / corps  
6. **Mono uniquement** — codes CMD, DEV, SKU, montants secondaires  
7. **Micro-motion 150–220ms** — hover, tab, drawer, toast  
8. **Guidage contextuel** — prochaine action, empty state actionnable  
9. **IA / spatial léger** — hints UX, pas de 3D gadget  
10. **Français typographique** — espaces fines, `86 216 Ar`, `120 cm`

### Anti-patterns à éviter
- Carte dans carte dans carte sans hiérarchie  
- Rouge plein sur sous-menu actif  
- `text-xs` pour contenu principal  
- `rounded-2xl` aléatoire sur formulaires  
- Modules « skins » différents (Talk, Backoffice legacy)

---

## ÉTAPE 3 — Direction artistique (cible)

### Identité
- **Marque :** rouge framboise `#E7194F`, dégradé or `#FFB21A`  
- **Dark :** bleu nuit `#07111F` → `#121E31` cartes  
- **Light :** app `#FAFAFB`, cartes `#FFFFFF`, texte `#151B26`  
- **Accent secondaire :** or ambre pour KPI / alertes non critiques  

### Tokens renforcés
Voir `lib/design/design-direction.ts` et `styles/design-system.css`.

### Rayons globaux
- **UI standard : 10px** (`--orion-radius`, `--radius-md`)  
- **Pill / avatar :** `9999px`  
- **Modales larges :** 10px (pas 16px sauf décision globale)

---

## ÉTAPES 4–10 — Plan d’action

### Étape 4 — Design system
- [x] `styles/design-system.css` — classes `orion-ds-*`  
- [x] `components/ui/app-ui.ts` — exports App* + `ANS_DESIGN_DIRECTION`  
- [x] Rayon global **10px** (`--orion-radius`, Tailwind, tokens TS)  
- [x] `Card` harmonisé (titre `text-base`, padding `p-4`)  
- [ ] Migrer modules legacy vers `AppPageContainer` + `AppModuleShell`  
- [ ] Unifier ANS Talk sur tokens  

### Étape 5 — Couleurs / contrastes
- [x] Mode clair `light-theme.css`  
- [ ] Audit WCAG automatisé sur 10 écrans clés  
- [ ] Renforcer `--muted-foreground` shadcn en light  

### Étape 6 — Grilles
- [x] `layout-grid.css` 12 colonnes  
- [ ] Forcer `card-span-*` sur tous widgets dashboard même niveau  
- [ ] Éliminer marges négatives ad hoc  

### Étape 7 — Typographie
- [x] Manrope + TYPO tokens  
- [ ] Remplacer `h1`/`h2` dispersés par `PageHeader` / `SectionHeader`  
- [ ] `CardTitle` → `text-base font-semibold`  

### Étape 8 — UX
- [x] `lib/ux/feedback.ts`, `ux-interactions.css`  
- [ ] Stepper interactif commandes  
- [ ] Confirmations critiques uniformes  

### Étape 9 — Modules (ordre)
1. Dashboard → 2. CRM → 3. POS → 4. Panier/Devis → 5. Commandes → 6. Production → 7. Talk → 8. Backoffice → 9. Finance/Stock/RH  

### Étape 10 — Tests
- `npm run build`  
- `npm run dev:local`  
- `npm run audit:vercel`  
- Navigation desktop/mobile, themes, sidebar  
- Rapport : `docs/FINAL_DESIGN_10_STEPS_REPORT.md`  

---

## Modules prioritaires (score impact × effort)

| Rang | Module | Raison |
|------|--------|--------|
| 1 | Dashboard | Vitrine quotidienne, grilles visibles |
| 2 | POS + Panier | Parcours revenue |
| 3 | Clients CRM | Données denses |
| 4 | Commandes 360° | Card nesting |
| 5 | Sidebar / Shell | Cohérence globale |
| 6 | Devis / Factures | Documents clients |
| 7 | ANS Talk | CSS parallèle |
| 8 | Backoffice | Legacy CSS |
| 9 | RH / Finance | Tableaux |
| 10 | Production / Planning | Gantt custom |

---

## Fichiers de référence design

| Fichier | Rôle |
|---------|------|
| `styles/design-tokens.css` | Couleurs, surfaces, ombres |
| `styles/light-theme.css` | Overrides mode clair |
| `styles/design-system.css` | Classes composants unifiées |
| `styles/layout-grid.css` | Grille 12 col dashboard |
| `styles/ux-interactions.css` | Motion, next-action |
| `lib/design/tokens.ts` | Constantes TS |
| `lib/design/typography.ts` | Classes typo |
| `lib/design/spacing-system.ts` | Gaps, paddings |
| `lib/design/design-direction.ts` | Direction artistique |
| `components/ui/app-ui.ts` | Barrel App* |

---

*Document vivant — mettre à jour à chaque étape complétée.*
