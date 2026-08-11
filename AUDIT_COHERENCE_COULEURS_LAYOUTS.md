# AUDIT — Cohérence couleurs & layouts

Date : 2026-07-11

## Couleurs

### Unifié

- Accent principal : `#FF174D` (plus de `#cc0033` / `#E7194F` comme source TS)
- Or : `#FACC15`
- Charts : série sans violet `#A78BFA` / `#8B5CF6`
- Alias `ORION_COLORS.violet` → rouge ANS (évite dérives UI)

### Modes

| Mode | Clair | Sombre |
| --- | --- | --- |
| Page | `#F6F8FC` | `#02030D` |
| Card | `#FFFFFF` | `#071021` |
| Hover | `#F1F5F9` | `#0B1830` |
| Dropdown | `#FFFFFF` | `#0A1022` |

### Remap CSS utilitaires violet

Dans `.orion-viewport`, classes `bg-violet-*` / `text-violet-*` / `bg-purple-*` → rouge soft / rouge.

### Restes acceptables

- Couleurs **métier produit** (encres « Violet » catalogue) — ne pas toucher
- Badges paiement Mobile Money historiques — à migrer progressivement

## Layouts

| Zone | Règle |
| --- | --- |
| Viewport | pleine largeur, pad `clamp` |
| Shell | sidebar + sticky header + main |
| Dashboard | grid 12 + module grid 2/3/4 |
| Admin / CPS | tokens `--ab2-*` / `--cps-*` alignés ultra |
| Tables | 1 surface, séparateurs 1px soft, pas de bordures verticales |

## Cadres

Réduction active via :

- `orion-ui-ux-complete.css` (nested card → transparent)
- `anti-contours.css` / `ui-structure.css`
- `.orion-ds-card` sans border en clair

## Incohérences restantes (backlog)

1. Hardcodes `7px` résiduels dans `app/globals.css` utilities legacy
2. Fichier nommé `palette-orion-violet.css` (contenu navy/rouge)
3. Modules Communication / RH encore partiellement en classes ad hoc
4. Shadows dupliquées entre anti-contours et light-white-only (acceptable si cascade claire)

## Verdict

Cohérence **globale** atteinte au niveau design system + cascade CSS.  
Écarts résiduels = dette visuelle locale, pas de rupture métier.
