# Reconstruction UI — Catalogue Prix & Stock

Date: 2026-07-14

## Livré

### Design

- Rail **8 studios** reconstruit (`.cps-studio-nav`)
- Cadres unifiés **`CpsStudioFrame`** (titre + toolbar + surface table)
- Radius **7px**, grilles familles / cockpit, mini-KPI matières
- Tables embarquées : chrome imbriqué retiré (pas de double header / KPI / onglets)

### Fusions

| Avant | Après |
|-------|--------|
| Cockpit KPI + VueGlobale Stats | `CockpitStudio` (KPI + raccourcis + migrate/rebuild) |
| Matières / Stock / Prix contexte séparés | `MaterialStockStudio` (3 modes, même shell) |
| Catalogue + tabs Anomalies/Corbeille en embed | Tabs hub seulement ; embed = fiche articles |
| Excel / Anomalies intros dupliqués | Cadre hub + panel métier seul |

### Inchangé (protection)

- Formules `lib/pricing/*` / `lib/packaging/*`
- APIs sync / Excel / matières / catalogue
- Routes legacy + redirects

### Validations

- `pricing-regression.test.ts` : 6/6
- Smoke ADM01 studios + cockpit API : OK
