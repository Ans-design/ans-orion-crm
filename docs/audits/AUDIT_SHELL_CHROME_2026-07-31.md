# ANS ORION — Audit approfondi : Shell chrome (sidebar + header)

| Champ | Valeur |
|-------|--------|
| Date | 2026-07-31 |
| Cibles DOM | Brand · Search ⌘K · Widget profil · Panier · Notifs · Thème · LateArrivalGate |
| Objectif | Collecte anomalies chrome ERP moderne |
| Règle | ANS Talk FAB → `/messagerie` only |

## Score Shell chrome : **7 / 10**

---

## 0. Carte AppShell

```text
LateArrivalGate
  OrionSidebar (brand, search, favoris, univers, user widget)
  header (menu mobile, ⌘K, ORION badge, panier, notifs, thème)
  main + AlertTicker
  drawer mobile · CommandPalette · FloatingMessengerRoot
```

---

## 1. Pièces auditées

| Pièce | Existe | Score | Verdict |
|-------|--------|------:|---------|
| Brand `orion-sb-brand` | Oui | 8 | ORION + homeRoute OK |
| Search `orion-sb-search-panel` | Oui | 6 | ⌘K trompeur Win ; palette sans moduleAccess |
| User widget | Oui | 6 | Menu OK ; dot « online » faux |
| CartDrawerTrigger | Oui | 5 | **Pas de drawer** → `/panier` ; visible tous rôles |
| Notifications | Oui | 5 | Fallback **audit logs** comme notifs métier |
| Thème | Oui | 6 | Caché &lt; sm ; `ThemeToggle.tsx` orphelin |
| LateArrivalGate | Oui | 8 | Wrappe tout ; fail-open |
| ANS Talk FAB | Oui | 9 | Conforme (plein écran) |
| Mobile drawer | Oui | 6 | Pas dialog a11y |
| Favoris | Oui | 6 | localStorage only |
| Role switcher | **Non** | 0 | Gap démo/support |

---

## 2. Findings

### P1

| ID | Finding | Reco |
|----|---------|------|
| SH-01 | Notifs fallback `/api/audit` = faux alertes métier | Ne jamais fallback audit |
| SH-02 | Thème absent mobile (&lt; sm) | Toggle mobile ou Apparence |

### P2

| ID | Finding | Reco |
|----|---------|------|
| SH-03 | Panier visible atelier ; naming Drawer | Gate rôles vente ; renommer |
| SH-04 | Palette sans `moduleAccess` + quick actions globales | Filtrer |
| SH-05 | Drawer mobile / palette sans `role=dialog` | Focus trap |
| SH-06 | Pas de role switcher | « Voir comme » admin/démo |
| SH-07 | Favoris local-only | Sync user settings |
| SH-08 | Affichage ⌘K vs Ctrl+K | Détection plateforme |

### P3

| ID | Finding | Reco |
|----|---------|------|
| SH-09 | `ThemeToggle.tsx` orphelin | Brancher ou masquer |
| SH-10 | Dot présence toujours vert | Retirer |
| SH-11 | Notif sans `aria-expanded` / count | Badge numérique |

---

## 3. Détail DOM demandés

### Brand

« ORION · ANS DESIGN PRINT • ERP LOCAL » — lien home profil. OK.

### Search + ⌘K

Ouvre CommandPalette. Debounce 200 ms. UX kbd et filtrage rôle à corriger.

### Widget « AL Admin Local (ADM01) Direction »

Initiales + nom + label profil + menu compte / apparence / logout. Dot online cosmétique.

### Panier header

`CartDrawerTrigger` → navigate `/panier`. Count cart-store. Bruit hors commercial.

### Notifications

Fetch à l’ouverture (bon). Chaîne notifs → unread → **audit** (mauvais). Dot sans count.

### Thème

`aria-label="Basculer le thème"`. Persist local. Manque mobile.

### LateArrivalGate

Gate RH retard ; children montés ; overlay si blocked. Thème/notifs/panier sont **sous** ce gate.

---

## 4. Conserver

| Élément | Action |
|---------|--------|
| FAB Talk → messagerie | Conserver strictement |
| LateArrivalGate | Conserver |
| Favoris local | Enrichir, ne pas supprimer |
| Alias CartDrawer* | Renommer / masquer, pas delete |

---

## 5. Roadmap → 10/10

1. Notifs sans audit + thème mobile  
2. Gate panier + a11y dialogs  
3. Palette filtrée + favoris serveur  
4. Role switcher démo  

---

## 6. Checklist 10/10

- [ ] Notifs métier seulement  
- [ ] Thème accessible mobile  
- [ ] Panier rôle-aware  
- [ ] Palette = sidebar permissions  
- [ ] Talk FAB conforme (déjà)  
- [ ] a11y dialogs  
- [ ] Aucune suppression chrome utile  

---

*Téléchargeable.*
