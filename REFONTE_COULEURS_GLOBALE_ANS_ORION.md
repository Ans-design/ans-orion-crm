# REFONTE COULEURS — Blue-black premium ANS ORION

**Date :** 2026-07-11  
**Direction :** Fond bleu nuit presque noir (`#02030D`) · accents rouge ANS · or alertes  
**Périmètre :** UI / tokens uniquement.

---

## Palette appliquée

| Zone | Token | Hex |
|---|---|---|
| App background | `--ans-bg-main` | `#02030D` |
| Sidebar | `--ans-bg-sidebar` | `#030611` |
| Topbar | `--ans-bg-topbar` | `#040814` |
| Panels | `--ans-bg-panel` | `#050A18` |
| Cards | `--ans-bg-card` | `#071021` |
| Secondary cards | `--ans-bg-card-2` | `#091428` |
| Hover | `--ans-bg-card-hover` | `#0B1830` |
| Active tab/row | `--ans-bg-active` | `#0E1D39` |
| Border soft | `--ans-border-soft` | `#12213D` |
| Border strong | `--ans-border-strong` | `#1A2C4D` |
| Text primary | `--ans-text-primary` | `#F8FAFC` |
| Text secondary | `--ans-text-secondary` | `#CBD5E1` |
| Text muted | `--ans-text-muted` | `#94A3B8` |
| Text dim | `--ans-text-dim` | `#64748B` |
| Primary red | `--ans-primary` | `#FF174D` |
| Hover red | `--ans-primary-hover` | `#FF3366` |
| Active red | `--ans-primary-active` | `#E0003B` |
| Warning / gold | `--ans-gold` | `#FACC15` |
| Amber | `--ans-amber` | `#F59E0B` |

---

## Fichiers mis à jour

- `styles/palette-orion-violet.css` (palette blue-black — nom de fichier historique)
- `styles/design-tokens.css`
- `app/globals.css` (HSL shadcn + sidebar)
- `styles/theme-global-refonte.css` (topbar / cards)
- `components/admin/catalogue-prix-stock/catalogue-prix-stock-light.css`
- `components/backoffice-v2/admin-backoffice.css`
- `components/backoffice-v2/ui/admin-table.css`
- `components/backoffice-v2/admin-backoffice-layout.css`

---

## Supprimé / remplacé

- Violets (`#05002F`, `#0B0142`, `#100444`, …)
- Bleus trop clairs / graphite parasites
- Fonds lumineux en dark

---

## Validation

1. Thème sombre + `Ctrl+F5`
2. `/administration/catalogue-prix-stock` — fond `#02030D`, cartes `#071021`
3. Sidebar `#030611`, topbar `#040814`
4. CTA rouge `#FF174D`, warnings or
5. Aucune zone violet / bleu clair résiduelle

**Métier :** inchangé (données, formules, sync).
