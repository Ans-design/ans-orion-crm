# AUDIT — Refonte structure UI (cadres imbriqués + arrondis 10px)

**Date :** 2026-07-11  
**Priorité :** Administration > Catalogue, Prix & Stock · Options / Chips  
**Périmètre :** UI structure / radius — pas de logique métier.

---

## 1. Problème

Cadres imbriqués (page → panel → card → table) + arrondis hétérogènes (7 / xl / 2xl) → effet « boîte dans boîte ».

---

## 2. Pages / composants audités

| Zone | Problème | Correction |
|---|---|---|
| `CataloguePrixStockWorkspace` | `cps-panel-surface` autour de tout le contenu | → `cps-content-flat` |
| `OptionsChipsEditor` | panel autour du workspace | → flat |
| `AnomalyCenter` | carte intro + panel | → texte plat + panel unique |
| `ExcelManager` | intro + panel | → intro légère + workspace direct |
| `catalogue-pos-studio` embed | nav + studio = 2 cartes | → 1 split, border-right |
| `ab2-options-split` | left/center bordés séparément | → 1 cadre, séparation interne |
| Accordion chips table | double wrap table | → table sans border dans accordion |

---

## 3. Arrondis uniformisés

**Token :** `--radius-ui: 10px`

Appliqué via :
- `app/globals.css` (`--radius`, `--orion-radius`)
- `tailwind.config.ts` (sm→3xl → 10px, `full` conservé)
- `styles/ui-structure.css`
- CPS composants `rounded-[10px]`
- `catalogue-pos-studio.css`
- `Button` → `rounded-[var(--radius-ui,10px)]`

**Exceptions :** `rounded-full` (avatars, switches, pills).

---

## 4. Classes utilitaires créées

`styles/ui-structure.css` :
- `.ui-card` / `.ui-panel` / `.ui-button` / `.ui-input` / `.ui-table` / `.ui-toolbar`
- `.ui-split` / `.ui-split-left` / `.ui-split-right`
- `.ui-flat` / `.cps-content-flat`
- anti nested borders pour catalogue embed

---

## 5. Structure attendue (CPS)

```
Header
KPI
Tabs principaux
Contenu flat
  └─ Split (1 cadre) : liste | options/table
```

Plus de : Page > card > card > panel > table.

---

## 6. Tests visuels

| # | Critère | Statut |
|---|---|---|
| 1 | Moins de cadres imbriqués CPS | OK code |
| 2 | Options/Chips split simple | OK code |
| 3 | Table = 1 cadre max | OK code |
| 4 | Arrondis 10px rectangles | OK tokens |
| 5 | Boutons/inputs/cards même rayon | OK |
| 6 | Pas de wrapper boîte-dans-boîte CPS | OK |
| 7 | Lisibilité | À valider F5 |
| 8 | Données / sync intactes | OK (UI only) |

---

## 7. Restes

- Autres modules (Cockpit, Stock, Production) : tokens globaux déjà à 10px ; wrappers locaux à auditer progressivement
- Quelques `border-radius: 7px` résiduels hors CPS possibles dans CSS legacy
- Hard refresh obligatoire

**Critère final :** interface plus simple, arrondi 10px, sans carte-dans-carte inutile sur CPS / Options-Chips.
