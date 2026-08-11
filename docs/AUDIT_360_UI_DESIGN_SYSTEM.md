# AUDIT 360 — Phase 4 : Design UI / Design System

Date : 2026-07-04  
Références : `docs/DESIGN_SYSTEM_UX.md`, `docs/UI_AUDIT.md`, `docs/FINAL_DESIGN_10_STEPS_REPORT.md`

---

## Design system Orion (existant)

| Token | Valeur | Usage |
|-------|--------|-------|
| Rouge ANS | `#cc0033` / vif `#ff1e56` | Actions, brand |
| Jaune | `#eab308` | Alertes, KPI |
| Radius | **7px** (`rounded-lg`) | Tous composants |
| Dark | Obsidian | Mode sombre |
| Fonts | Manrope + JetBrains Mono | UI + montants |

---

## Incohérences visuelles (P2)

| Zone | Problème | Action |
|------|----------|--------|
| Dashboard | Mélange Recharts + cards KPI styles | Unifier `chart-widgets.tsx` |
| Backoffice pricing | Styles `pta-*` legacy + Orion | Migrer tokens Tailwind |
| POS | Densité élevée mobile | Spacing 4/8 grid strict |
| Tables | Hauteurs lignes variables | Composant `DataTable` Orion |
| Modales | Radius parfois `rounded-2xl` | Normaliser 7px ou 2xl documenté |
| Card-in-card | Dashboard, commande 360 | Aplatir 1 niveau max |

---

## Pages prioritaires redesign P1

1. `/commandes/[id]` — hub 360 (tabs, finance)
2. `/pos/[id]` — configurateur
3. `/dashboard` — pilotage
4. `/administration/prix` — backoffice
5. `/login` + déclaration retard RH

---

## Quick wins UI

- Badges statut unifiés (`order-status-labels`, finance, production)
- Boutons primaires rouge ANS cohérents
- Montants `font-mono` partout (Ariary)
- Empty states avec action suivante (`flow-context-banner`)

---

## Storybook (P3)

Créer stories : Button, Badge, KPI card, Order tabs, Encaissement modal, POS field chips.

---

## Priorités

**P1 :** Hub commande, POS, login  
**P2 :** Tables, modales, backoffice pricing UI  
**P3 :** Storybook, animations Lottie
