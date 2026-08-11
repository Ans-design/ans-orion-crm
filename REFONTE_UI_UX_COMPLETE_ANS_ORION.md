# REFONTE UI/UX COMPLÈTE — ANS ORION / ANS CRM V3

Date : 2026-07-11  
Périmètre : design system, layout, composants, responsive, accessibilité  
**Hors périmètre** : Prisma, API, pricingResolver, sync Admin↔POS, Excel, règles métier

## Mode clair SaaS premium (références)

Couche `styles/light-saas-premium.css` (dernier import) :

- Page `#F4F7FB` · cards/sidebar blancs · ombres Soft-UI
- Radius clair **12px** · nav active rose ANS · badges pastels
- Tables type Contacts (header soft, hover bleu très pâle)
- Accent **rouge ANS** (pas le violet des maquettes)

## Étapes réalisées

| Étape | Contenu |
| --- | --- |
| 1. Audit | Couches CSS conflictuelles, radius 7 vs 10, violets UI, nested cards |
| 2. Design system | Tokens spacing, radius 10, surfaces, typo, focus, touch 44px |
| 3. Layout | Viewport full-width, grille 12, toolbars flex-wrap, KPI grid |
| 4. Composants | Cards plates, tables allégées, chips POS 10px, charts sans violet |
| 5. QA docs | 4 livrables + test a11y mis à jour |

## Fichiers clés

- `styles/orion-ui-ux-complete.css` — **couche structure globale** (nouvelle)
- `styles/light-white-only.css` — palette ultra clair/sombre
- `styles/palette-orion-violet.css` — tokens ANS (nom legacy)
- `styles/design-tokens.css` — spacing + radius
- `styles/design-system.css` — `.orion-ds-*` allégés
- `styles/layout-grid.css` — dashboards
- `styles/ui-structure.css` / `anti-contours.css` / `dropdown-theme.css`
- `lib/design/tokens.ts` — ORION_COLORS / CARD / SPACE
- `lib/dashboard/chart-theme.ts` — séries rouge/or (plus de violet)
- `lib/pos/chip-ui.ts` — radius 10px
- `app/globals.css` — import `orion-ui-ux-complete.css`

## Ce qui n’a pas été cassé

- Routes / modules métier conservés
- Calculs prix, chips, stocks, sync inchangés
- Aucune suppression de page ou API

## Validation manuelle recommandée

1. Hard-refresh clair + sombre
2. Dashboard, Admin CPS, POS, Devis, Commandes, RH, Finance
3. Mobile 375 / tablette 768 / desktop 1440
4. Tabulation clavier (focus rouge visible)
5. Dropdowns cohérents au thème
6. Smoke métier : ouvrir un devis, sync catalogue (sans régression visuelle bloquante)

## Suite optionnelle (itérations)

- Remplacer hardcodes violet restants module par module (TSX)
- Migrer pages encore en `border` double vers `.orion-ds-card`
- Renommer `palette-orion-violet.css` → `palette-orion.css`
- Mettre à jour règles Cursor encore sur 7px
