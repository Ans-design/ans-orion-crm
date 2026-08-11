# AUDIT 360 — Phase 14 : Typographie / Icônes / Lisibilité

Date : 2026-07-04  
Références : `docs/TYPOGRAPHY_AUDIT.md`, `docs/ICON_AUDIT.md`

---

## Polices actuelles

| Usage | Police |
|-------|--------|
| UI | Manrope (400–700) |
| Code / montants | JetBrains Mono |
| Display | `font-display` sur titres |

---

## Échelle typographique recommandée

| Niveau | Taille | Usage |
|--------|--------|-------|
| xs | 10–11px | Badges, meta |
| sm | 12–13px | Labels tableaux |
| base | 14px | Corps |
| lg | 16–18px | Sous-titres |
| xl+ | 20–24px | Titres page |

---

## Règles montants Ariary

- Toujours `font-mono` + `formatPrice` / `formatPriceAr`
- Séparateur milliers FR
- Suffixe « Ar » visible
- Alignement droite dans tableaux finance

---

## Icônes

- **Lucide React** — standard projet ✅
- Emojis catalogue POS — OK métier imprimerie
- **Action P2 :** Remplacer emojis admin par Lucide où confus

---

## Corrections prioritaires

| Zone | Action P2 |
|------|-----------|
| KPI dashboard | Taille uniforme chiffres |
| Sidebar collapsed | Tooltips labels |
| POS chips | Lisibilité mobile min 12px |
| References commande | Mono + copier |

---

## Priorités

**P2 :** Échelle type, montants, icônes admin  
**P3 :** Variable fonts, icon set custom Orion
