# Admin migration map (Lot 7 / Phase G)

Date : 2026-07-30 · Zéro suppression — alias / façades.

| Ancien / pile | Canonique | Statut | Notes |
|---------------|-----------|--------|-------|
| `components/admin/pricing-v4/*` | Hub + panels embarqués | transition | Pricing v4 dans Administration |
| `components/admin/catalogue-prix-stock/*` | `/administration/catalogue-prix-stock` | canonique UI | CPS |
| `components/administration/*` | `/administration/:section` | canonique shell | Macros sidebar |
| `components/backoffice-v2/*` | Tables matières/chips/tiers | canonique data | AB2 |
| `/admin-control` | `/administration/vue-ensemble` (+ tabs) | alias | next.config |
| `/admin/pricing` | `/administration/*` | alias | next.config |
| `/administration/variables` | page dédiée + menu Org | **visible** | 2026-07-30 |
| `/administration/synchronisation` | page dédiée + menu Production | **visible** | 2026-07-30 |
| `/administration/apercus` | legacy workspace apercus | visible Formules | 2026-07-30 |

Pas de 4ᵉ pile. Voir aussi `docs/ADMIN_UI_PILES_MAP_2026-07-30.md`.
