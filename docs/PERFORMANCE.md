## Patterns appliqués (lot fluide 2026)

| Pattern | Où |
|---------|-----|
| Analyses dashboard **fermées par défaut** | `dashboard/page.tsx` — Recharts à la demande |
| Polling graphiques 120s **si analyses ouvertes** | idem (onglet visible) |
| `dynamic()` widgets cockpit | BoardSynthesis, Health, Actions, Feed, MaterialStats |
| Ticker / Talk / palette différés `requestIdleCallback` | `app-shell.tsx` |
| Pas de refresh badges à **chaque** navigation | `orion-sidebar.tsx` |
| Permissions modules : cache + **dedupe fetch** | `use-effective-module-access.ts` |
| Badges nav : throttle visibility + anti-rafale 8s | `use-nav-badges.ts` |
| Badges Admin uniquement si univers Admin ouvert | `sidebar-universe-nav.tsx` |
| Catalogue POS : debounce live + AbortController | `use-pos-catalogue.ts` |
| Animations page opacity-only (~0.1s) | `globals.css`, `design-modern-2026.css` |
| Lanceur mobile `dynamic()` | `MobileNavLauncher` |
| `content-visibility: auto` | `styles/orion-perf-runtime.css` |
