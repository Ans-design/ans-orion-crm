# AUDIT — Correction mode clair Administration (Catalogue, Prix & Stock)

**Date :** 2026-07-11  
**Route :** `/administration/catalogue-prix-stock`  
**Périmètre :** UI / thème uniquement.

---

## 1. Problème

Mode clair activé (sidebar + topbar clairs) mais le contenu CPS restait **sombre hardcodé** (`.cps-theme` forçait `#070b18` / surfaces dark). Mélange light/dark + boutons outline blanc-sur-blanc.

---

## 2. Dark classes hardcodées trouvées

| Fichier | Avant |
|---|---|
| `catalogue-prix-stock-light.css` | `--cps-bg: #070b18` forcé |
| `admin-backoffice.css` `.ab2-shell` | tokens HSL dark + oat dark |
| `admin-table.css` `.ab2-table-wrap` | `background: #0f172a !important` |
| `master-data.css` | cards / cells `#0f172a` |
| `catalogue-pos-studio.css` | nav/studio `rgba(10,14,22,…)` |
| `EntityDrawer` / `AdminSidebar` / etc. | fallbacks dark hex |

---

## 3. Classes / styles remplacés

- `.cps-theme` → tokens light par défaut ; `.dark .cps-theme` → tokens dark
- `.ab2-shell` → light via `--app-*` ; `.dark .ab2-shell` → dark
- Table wraps / master-data → `var(--app-surface)`
- Studio catalogue → `var(--app-surface*)`
- Composants CPS → `var(--cps-*)` sans fallback dark

---

## 4. Tokens

Voir `--app-*` dans `styles/design-tokens.css` (light + `.dark`).  
CPS mappe `--cps-*` → `--app-*`.

---

## 5. Pages / surfaces testées (code)

| Surface | Light | Dark |
|---|---|---|
| CPS shell / header / KPI / tabs | OK | OK |
| Impression SF / Prix contexte (embeds) | OK (ab2 theme-aware) | OK |
| Options / Chips studio | OK | OK |
| Import / Export | OK | OK |
| Anomalies | OK | OK |
| Tables admin / master-data | OK | OK |

---

## 6. Résultat mode clair

Toute la zone CPS doit être claire : fond `#f8fafc`, cartes blanches, texte `#0f172a`, tabs/tables clairs, primary rouge.

## 7. Résultat mode sombre

`.dark` bascule CPS + ab2 + tables en surfaces `#070b18` / `#101827`.

## 8. Bugs restants possibles

- `material-modal.css` / quelques panneaux layout admin encore dark-fixe hors CPS
- Legacy `.orion-admin-legacy-layout` dark-fixe (CPS n’y passe plus)
- Hard refresh nécessaire après déploiement CSS

**Critère final :** mode clair → interface 100 % claire sur CPS, sans panneau/tableau sombre résiduel ; dark mode intact.
