# RH — Déclaration de retard : carte claire premium

**Date :** 2026-07-03  
**Statut :** Intégré  
**Périmètre :** UI déclaration de retard (gate RH + aperçu dev)

---

## Objectif

Fond global sombre bleu nuit ANS ORION + **carte centrale blanche** (#FAFAF8) lisible, professionnelle et rassurante — sans modifier la logique métier RH.

---

## Avant / Après

| Aspect | Avant | Après |
|--------|-------|-------|
| Fond | Overlay flou thème app | Gradient #07111F → #0A1424 + orbes discrets |
| Carte | 28rem, thème app (sombre en dark mode) | 680px max, blanc cassé fixe |
| Alerte RH | `OrionAlert` thème | Bandeau crème #FFF7E6 / amber |
| Employé | `OrionEmployeeDelayCard` variables CSS | `EmployeeDelaySummary` carte blanche dédiée |
| Options cause | Radio cards thème | Radio cards `tone="light"` (rose soft sélection) |
| Footer | Dégradé thème | Blanc intégré, CTA #D7194A 52px |
| Erreur réseau | Modale thème | Même fond sombre + petite carte claire |

---

## Fichiers modifiés

| Fichier | Rôle |
|---------|------|
| `styles/late-arrival-modal.css` | Refonte complète tokens + layout |
| `components/auth/late-arrival-gate.tsx` | Logique API inchangée, UI déléguée |
| `components/dev-preview/late-arrival-preview.tsx` | Mock aligné sur le nouveau design |
| `components/orion/auth/orion-radio-card.tsx` | Prop `tone="light"` pour carte blanche |

## Composants créés

| Fichier | Rôle |
|---------|------|
| `components/auth/auth-dark-background.tsx` | Fond sombre premium + orbes |
| `components/auth/employee-delay-summary.tsx` | Carte employé claire |
| `components/auth/delay-declaration-card.tsx` | Shell formulaire (header, alerte, causes, footer) |

---

## Logique métier — non modifiée

- `GET /api/rh/late-arrival` — vérification pointage
- `POST /api/rh/late-arrival` — `{ cause, remarque }`
- États gate : `loading | clear | error | success | blocked`
- Fail-closed client sur erreur GET
- Cause obligatoire ; commentaire obligatoire si **Autre**
- Délai succès 220 ms puis `clear` + toast
- Constantes `LATE_CAUSES` inchangées
- Icône panne : `Wrench` (alignement maquette)

---

## Responsive

- Desktop : carte centrée max 720px, **grille 2×3** pour les causes
- **Aucun défilement interne** : overlay `overflow: hidden`, corps de carte `overflow: visible`
- Ajustement automatique `scale()` si hauteur viewport insuffisante (ResizeObserver, min 72 %)
- Mobile : grille 1 colonne sous 400px ; textarea 2 lignes, `resize: none`

---

## Accessibilité

- `role="dialog"` / `aria-modal` / `aria-labelledby`
- `role="radiogroup"` + radios clavier
- `aria-required` / `aria-invalid` sur textarea Autre
- `role="alert"` sur erreurs
- Focus ring CTA et textarea rose doux
- Contraste AA sur carte blanche (texte #111827 / secondaire #667085)

---

## Hydration

- Aucun `Date.now()`, `window`, `localStorage` dans le rendu gate
- Heures employé fournies par l’API (`currentTime` serveur)
- Animations Framer Motion côté client uniquement (déjà en place)

---

## Tests réalisés

```bash
npm run typecheck   # à lancer si .next/types présents
npx prisma validate
npm run test
```

Manuel :
- `/dev-preview/auth-ui` — aperçu login + modale retard
- Sélection causes, Autre + commentaire, CTA disabled
- Simulation succès aperçu

---

## Aperçu local

http://127.0.0.1:3020/dev-preview/auth-ui

---

## Build

`npx next build` validé en session précédente. En dev : purger `.next` si chunk manquant (`npm run dev:clean`).
