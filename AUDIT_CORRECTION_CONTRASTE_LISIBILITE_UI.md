# AUDIT — Correction contraste & lisibilité UI

**Date :** 2026-07-11  
**Périmètre :** UI uniquement (boutons, tokens, thème) — pas d’API / Prisma / sync / pricing.

---

## 1. Composants / cas illisibles trouvés

| Élément | Problème |
|---|---|
| Bouton **Rebuild index POS** (`variant="outline"`) | Texte hérité blanc (parent `.cps-theme` dark) sur fond clair → blanc sur blanc |
| Boutons `disabled:opacity-50` (shadcn) | Opacity trop faible / couleurs incohérentes |
| `.cps-btn:disabled { opacity: 0.45 }` | Texte quasi invisible |
| KPI `text-amber-300` / `text-red-300` | Illisible en mode clair |
| Badges sync `text-emerald-300` | Illisible en mode clair |
| Tables `.ab2-table-wrap { background: #0f172a }` | Forcé sombre même en light |

---

## 2. Classes dangereuses remplacées

- `disabled:opacity-50` → `disabled:opacity-100` + tokens `--app-disabled-*`
- Dark hardcodé CPS → tokens light/dark via `.cps-theme` / `.dark .cps-theme`
- Fallbacks `#070b18`, `#101827`, `#f8fafc` retirés des composants CPS
- `outline` / `secondary` Button → `text-[var(--app-text)]` + `bg-[var(--app-surface)]`

---

## 3. Boutons corrigés

- `components/ui/button.tsx` — variants + disabled lisible + `warning`
- `.cps-btn:disabled` — fond/texte disabled tokens, opacity 1
- Règle globale `styles/contrast-theme.css` — tous `button:disabled`
- Rebuild index POS : hérite du fix outline + disabled

---

## 4. Tokens ajoutés (`styles/design-tokens.css`)

**Light :** `--app-bg`, `--app-surface`, `--app-surface-soft`, `--app-border`, `--app-text`, `--app-muted`, `--app-primary`, `--app-primary-hover`, `--app-warning`, `--app-success`, `--app-danger`, `--app-disabled-bg`, `--app-disabled-text`

**Dark :** mêmes tokens avec valeurs sombre premium.

---

## 5. Tests mode clair

| Test | Attendu | Statut code |
|---|---|---|
| Rebuild index POS lisible | fond surface + texte foncé | OK |
| Disabled lisible | gris clair / texte slate | OK |
| Pas de blanc sur blanc | tokens + contraste | OK |
| Tabs / KPI / tables clairs | CPS theme-aware | OK |

## 6. Tests mode sombre

| Test | Attendu | Statut code |
|---|---|---|
| Rebuild index POS lisible | surface sombre + texte clair | OK |
| Disabled lisible | slate-800 / slate-400 | OK |
| Basculer thème | sidebar + contenu cohérents | OK |

---

## 7. Checklist avant / après

**Avant :** bouton outline illisible ; CPS forcé dark ; tables `#0f172a`  
**Après :** tokens dynamiques ; disabled lisible ; CPS suit `html.dark`

## 8. Restes à vérifier manuellement

- Toasts / tooltips hors CPS
- Modals pricing (`material-modal.css` encore partiellement dark)
- Pages hors Administration (contraste global via Button + contrast-theme)
