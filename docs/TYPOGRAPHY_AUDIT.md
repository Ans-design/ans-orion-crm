# Audit typographique — ANS ORION

Date : 24 juin 2026  
Portée : refonte typographique professionnelle (polices, hiérarchies, français, lisibilité)

---

## 1. État initial détecté

| Élément | Avant |
|---------|--------|
| Police UI | Plus Jakarta Sans + Space Grotesk (Google Fonts `@import`) |
| Police mono | JetBrains Mono (chargement externe) |
| Chargement | `@import` dans `globals.css` — pas de `next/font` |
| Titres page | Mélange `font-display`, `text-2xl`, `font-bold` |
| Labels | Nombreux `text-[10px] uppercase tracking-wide` |
| KPI | `font-mono font-bold text-2xl`, labels en majuscules |
| Montants | `formatPrice` sans espace fine insécable systématique |
| Badges | `text-[10px] font-semibold`, statuts en majuscules |
| Tableaux | En-têtes `font-medium` sans style unifié |

### Problèmes principaux

- Trois familles chargées (Jakarta, Grotesk, Mono) pour un rendu peu cohérent
- Hiérarchie des titres variable selon les modules
- Abus de majuscules et de `text-[10px]` comme corps de texte
- Montants et pourcentages sans règles françaises strictes
- Codes/références parfois en sans-serif, parfois en mono

---

## 2. Nouvelle stack typographique

| Rôle | Police | Chargement |
|------|--------|------------|
| UI principale | **Manrope** | `next/font/google` → `--font-sans` |
| Codes / montants techniques | **JetBrains Mono** | `next/font/google` → `--font-mono` |

**Règle** : maximum 2 familles. `--font-display` = alias de `--font-sans`.

Fichiers centraux :
- `app/layout.tsx` — import et variables CSS
- `lib/design/typography.ts` — tokens Tailwind (`TYPO`)
- `lib/format/french-typography.ts` — formatage français
- `app/globals.css` — classes utilitaires `.orion-text-*`
- `components/ui/typography.tsx` — composants `PageTitle`, `SectionTitle`, `AmountText`, `CodeText`…

---

## 3. Échelle typographique

| Niveau | Classe / token | Style |
|--------|----------------|-------|
| Titre page (H1) | `.orion-text-page-title` / `TYPO.pageTitle` | `text-xl md:text-2xl font-semibold tracking-tight leading-tight` |
| Section (H2) | `.orion-text-section-title` | `text-lg font-semibold leading-snug` |
| Section large | `.orion-text-section-title-md` | `text-xl font-semibold leading-snug` |
| Carte (H3) | `.orion-text-card-title` | `text-base font-semibold leading-normal` |
| Corps | `.orion-text-body` | `text-sm leading-5` |
| Corps atténué | `.orion-text-body-muted` | `text-sm leading-5 text-muted-foreground` |
| Label formulaire | `.orion-text-label` | `text-sm font-medium leading-5` |
| Meta / aide | `.orion-text-meta` | `text-xs leading-4 text-muted-foreground` |
| KPI valeur | `.orion-text-kpi-value` | `text-xl md:text-2xl font-semibold tabular-nums` |
| Montant | `.orion-text-amount` | `font-mono text-sm font-semibold tabular-nums` |
| Code / référence | `.orion-text-code` | `font-mono text-xs tabular-nums` |
| Badge | `text-xs font-medium leading-none` | — |
| Bouton principal | `text-sm font-semibold` | variantes default/destructive |
| Onglet | `.orion-tab-btn` | `text-sm font-medium` (actif : `font-semibold`) |
| En-tête tableau | `TableHead` | `text-xs font-semibold uppercase tracking-wide` |

---

## 4. Règles françaises appliquées

Helpers dans `lib/format/french-typography.ts` :

| Règle | Implémentation |
|-------|----------------|
| Milliers | Espace fine insécable (`U+202F`) via `formatNumberFr()` |
| Montants + Ar | `formatPriceAr()` → `86 216 Ar` |
| Pourcentage | `formatPercentFr()` → `50 %` |
| Unités | `formatUnitFr(n, unit)` |
| Ponctuation double | `punctuateFr()` — espace insécable avant `: ; ? !` |
| Ellipse | Constante `ELLIPSIS` = `…` (ex. `Chargement…`) |

`formatPrice` / `formatPriceAr` réexportés depuis `lib/data/catalogue.ts` pour compatibilité.

---

## 5. Modules corrigés

### Fondation
- `app/layout.tsx`, `app/globals.css`, `tailwind.config.ts` (inchangé — variables existantes)
- `components/layouts/page-header.tsx`
- `components/ui/section-header.tsx`
- `components/ui/label.tsx`, `badge.tsx`, `stat-badge.tsx`, `button.tsx`, `table.tsx`, `kpi-card.tsx`
- `components/ui/app-ui.ts` — exports typo + formatage FR

### Commandes
- `order-header-compact.tsx` — numéro mono, statuts sans majuscules, `formatPriceAr`, `formatPercentFr`
- `commande-qr-badge.tsx` — codes en `.orion-text-code`
- `commande-360-view.tsx` — titres de section en casse normale
- `app/(app)/commandes/page.tsx` — titre section

### Panier
- `cart-summary.tsx`, `cart-item-card.tsx`, `cart-actions.tsx` — titres, montants, labels

### CRM Clients
- `app/(app)/clients/page.tsx` — titres page/section, labels formulaire

### Dashboard & shell
- `app/(app)/dashboard/page.tsx` — titres cartes, badges, meta annonces
- `app/(app)/_components/app-shell.tsx` — alertes système, cockpit

### POS
- `app/(app)/pos/[id]/page.tsx` — labels configurateur, titres article
- `app/(app)/pos/conception/page.tsx` — page conception graphique

### Backoffice
- `admin-control-*`, `pricing-v4/*`, `fusion-admin-panels`, `access-requests-panel`, `article-pricing-inline-sections`

### ANS Talk
- `components/ans-talk/*` — conversations, messages, contexte, annonces

### CSS globaux Orion
- `.orion-kpi-tile-value/label`, `.orion-tab-btn`, `.orion-data-row-*`
- `.orion-section-title/desc`, `.orion-ref-muted`, `.orion-amount`

---

## 6. Composants standardisés

| Composant | Usage |
|-----------|-------|
| `PageTitle` / `AppPageTitleText` | H1 de page |
| `SectionTitle` / `AppSectionTitleText` | H2 de section |
| `CardTitle` / `AppCardTitleText` | Titre de carte |
| `MetaText` / `AppMetaText` | Sous-information |
| `AmountText` / `AppAmountText` | Montants |
| `CodeText` / `AppCodeText` | Références CMD/DEV |
| Classes CSS `.orion-text-*` | Usage direct sans composant React |

---

## 7. Fichiers modifiés

```
app/layout.tsx
app/globals.css
lib/design/typography.ts
lib/format/french-typography.ts
lib/data/catalogue.ts
components/ui/typography.tsx
components/ui/app-ui.ts
components/layouts/page-header.tsx
components/ui/section-header.tsx
components/ui/label.tsx
components/ui/badge.tsx
components/ui/stat-badge.tsx
components/ui/button.tsx
components/ui/table.tsx
components/ui/kpi-card.tsx
components/commandes/order-header-compact.tsx
components/commandes/commande-qr-badge.tsx
components/commandes/commande-360-view.tsx
components/panier/cart-summary.tsx
components/panier/cart-item-card.tsx
components/panier/cart-actions.tsx
app/(app)/commandes/page.tsx
app/(app)/clients/page.tsx
app/(app)/dashboard/page.tsx
app/(app)/_components/app-shell.tsx
app/(app)/pos/[id]/page.tsx
app/(app)/pos/conception/page.tsx
components/admin/admin-control-*.tsx
components/admin/pricing-v4/**/*.tsx
components/admin/fusion-admin-panels.tsx
components/admin/access-requests-panel.tsx
components/admin/article-pricing-inline-sections.tsx
components/ans-talk/**/*.tsx
```

---

## 8. Recommandations restantes

1. ~~**Passe globale majuscules** — Backoffice, Dashboard, POS, ANS Talk~~ *(passe 2 effectuée — reliquats possibles dans modules secondaires)*
2. **Ponctuation française en masse** — Appliquer `punctuateFr()` ou réviser manuellement les chaînes UI longues (`:` avant labels, guillemets `« »`).
3. **Devis / POS** — Uniformiser numéros devis en `CodeText`, montants en `formatPriceAr`.
4. **Sidebar / app-shell** — Réduire `text-[10px] uppercase` sur alertes système.
5. **Clients fiche complète** — Labels restants `#8B5CF6 uppercase` à harmoniser.
6. **Tests visuels** — Vérifier mode sombre sur KPI or/orange et contrastes meta.
7. **STYLE_GUIDE.md** — Mettre à jour la section polices (Manrope + JetBrains Mono).

---

## 9. Validation

- [x] Une police UI principale (Manrope)
- [x] Une police mono pour codes (JetBrains Mono)
- [x] Tokens centralisés (`TYPO`, `.orion-text-*`)
- [x] Hiérarchie titres unifiée sur composants de base
- [x] `tabular-nums` sur KPI et montants
- [x] Formatage français montants / %
- [x] Majuscules réduites sur modules prioritaires
- [ ] Build production (`npm run build`) — à valider après arrêt du serveur dev
