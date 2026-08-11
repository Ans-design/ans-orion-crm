# AUDIT 360 — Phase 9 : Couleurs / Accessibilité / Contraste

Date : 2026-07-04  
Références : `docs/DESIGN_SYSTEM_UX.md`, audit screenshots `audit-screenshots/`

---

## Palette ANS actuelle

| Rôle | Couleur | Usage |
|------|---------|-------|
| Primary | `#cc0033` | CTA, brand |
| Primary vif | `#ff1e56` | Hover, accents |
| Warning | `#eab308` | KPI alerte |
| Success | emerald-600 | Paiement soldé, validé |
| Info | `#00D9FF` / sky | Impact prix backoffice |
| Dark bg | obsidian | Mode sombre |

---

## Problèmes contraste (P2)

| Élément | Risque | Action |
|---------|--------|--------|
| Texte muted sur card/40 | AA limite mode clair | Renforcer `--muted-foreground` |
| Badges amber Partiel | OK light, vérifier dark | Test Stark |
| Rouge sur fond rouge/10 | OK pour labels | — |
| Graphiques dashboard | Couleurs proches | Palette chart dédiée 5 teintes |
| Placeholder inputs POS | Faible contraste | `placeholder:text-muted-foreground/80` |

---

## Tokens CSS recommandés

Consolider dans `globals.css` :
- `--orion-red`, `--orion-red-vif`, `--orion-yellow`
- `--status-success`, `--status-warning`, `--status-error`, `--status-info`
- `--chart-1` … `--chart-5`

---

## Mode sombre

Screenshots audit : `92-theme-dark-dashboard.png`, `92-theme-light-dashboard.png`  
**Action P2 :** Revue parité composants dashboard + sidebar.

---

## Priorités

**P1 :** Contraste boutons primaires, erreurs formulaires  
**P2 :** Badges statut, graphiques, dark mode  
**P3 :** Audit AA complet automatisé (axe-core CI)
