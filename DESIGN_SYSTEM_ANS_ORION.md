# DESIGN SYSTEM — ANS ORION

Source de vérité visuelle pour tous les modules.

## Principes

1. **Un thème, deux modes** — clair SaaS / sombre bleu nuit
2. **Rouge ANS** `#FF174D` = accent principal · **Or** `#FACC15` = alerte / highlight
3. **Radius standard** = **10px** (pills / avatars = full)
4. **Ombre > contour** en clair · **surface > border** en sombre
5. **Pas de carte dans carte**
6. **Spacing** multiples de 4/8 (`--space-*`)
7. **Touch** min **44×44 px**
8. **Focus visible** obligatoire (anneau rouge)

## Palette

### Clair

| Token | Valeur |
| --- | --- |
| `--bg-app` | `#F6F8FC` |
| `--bg-sidebar` / card | `#FFFFFF` |
| `--bg-card-2` / header table | `#F8FAFC` |
| `--bg-hover` | `#F1F5F9` |
| `--border-soft` | `#EEF2F7` |
| `--text-main` | `#0F172A` |
| `--text-muted` | `#64748B` |

### Sombre

| Token | Valeur |
| --- | --- |
| `--bg-app` | `#02030D` |
| `--bg-sidebar` | `#030611` |
| `--bg-header` | `#040814` |
| `--bg-surface` | `#050A18` |
| `--bg-card` | `#071021` |
| `--bg-hover` | `#0B1830` |
| `--text-main` | `#F8FAFC` |

## Radius

```css
--radius-ui: 10px;
--orion-radius: 10px;
--radius-sm: 8px; /* petits contrôles uniquement */
```

## Spacing

```css
--space-1: 4px;  --space-2: 8px;  --space-3: 12px;
--space-4: 16px; --space-6: 24px; --space-8: 32px;
```

## Typographie

| Niveau | Taille | Poids |
| --- | --- | --- |
| H1 page | clamp 1.25–1.5rem | 650 |
| H2 section | 1.125rem | 600 |
| Body | 0.875rem | 400 |
| Label table | 0.75rem uppercase | 600 |

## Composants canoniques

| Besoin | Classe / token |
| --- | --- |
| Carte | `.orion-ds-card` / `.ui-card` |
| KPI | `.orion-ds-metric` |
| Panel | `.orion-ds-panel` |
| Toolbar | `.orion-ds-toolbar` / `.ui-toolbar` |
| Table wrap | `.ui-table-wrap` |
| Page header | `.orion-ds-page-header` |
| Empty | `.orion-empty-state` |

## Boutons

| Variant | Clair | Sombre |
| --- | --- | --- |
| Primary | bg `#FF174D` · hover `#E6003C` | hover `#FF3366` |
| Secondary | blanc + border `#E2E8F0` | `#071021` + border soft |
| Ghost | transparent · hover `#F1F5F9` | hover `#0B1830` |
| Disabled | `#F1F5F9` / `#64748B` | `#1E293B` / `#94A3B8` |

## Dropdowns

- Clair : `#FFF` · selected `rgba(255,23,77,0.10)` · text `#BE123C`
- Sombre : `#0A1022` · selected `rgba(255,23,77,0.22)` · text `#FFF`

## Grille

- Macro : CSS Grid sidebar / header / main
- Dashboards : `.dashboard-grid` 12 colonnes
- Micro : Flexbox + `gap` (jamais marges négatives)

## Fichiers

1. `styles/design-tokens.css`
2. `styles/palette-orion-violet.css`
3. `styles/orion-ui-ux-complete.css`
4. `styles/light-white-only.css` (dernier import couleur)
5. `lib/design/tokens.ts`

## Interdits

- Violet Tailwind comme accent UI
- Radius 7px hardcodé
- `disabled:opacity-20`
- Cadres imbriqués
- `max-w` inutile qui centre le contenu ERP
- Contours décoratifs sans rôle
