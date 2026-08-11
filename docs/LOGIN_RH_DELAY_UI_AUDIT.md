# Audit UI — Login & Déclaration de retard RH

**Date :** 2026-06-24  
**Périmètre :** `/login`, `LateArrivalGate`, auth layout, thème.

---

## Composants concernés

| Fichier | Rôle |
|---------|------|
| `app/login/page.tsx` | Page connexion (monolithique ~760 lignes) |
| `components/auth/late-arrival-gate.tsx` | Modale obligatoire retard RH |
| `styles/design-tokens.css` | Tokens `.orion-login-*` |
| `styles/late-arrival-modal.css` | Styles modale retard |
| `components/forms/password-field.tsx` | Champ mot de passe |
| `components/branding/orion-logo.tsx` | Logo hero |
| `middleware.ts` / `app/(app)/layout.tsx` | Redirect `session_expired` |
| `lib/services/late-arrival-service.ts` | Logique gate RH |

**Non utilisés avant refonte :** `components/orion/*` (design system app), `framer-motion` sur auth.

---

## Problèmes visuels

- Login **une seule colonne** centrée — pas de split desktop brand / formulaire.
- Hero logo au-dessus de la carte — hiérarchie faible, peu « SaaS premium ».
- Carte login **toujours blanche** même en mode sombre système.
- Points valeur (benefits) **cachés sur mobile**, peu visibles sur desktop.
- Modale retard : options radio **sans icônes ni descriptions** — aspect formulaire basique.
- Bandeau RH « Accès temporairement suspendu » — ton **punitif**.
- Absence de **badge retard** visuel distinct (+N min).

---

## Problèmes UX

- Message session expirée correct mais **peu mis en valeur**.
- Bouton submit sans libellé **« Connexion en cours… »** explicite.
- Comptes démo dans accordéon — OK, mais **hint local ADM01** très visible.
- Déclaration retard : pas d’affichage **heure actuelle** ni poste/service.
- Textarea remarques toujours visible — devrait être **souligné pour « Autre »**.
- Pas de feedback **succès animé** avant fermeture gate.

---

## Contraste & thème

- Login shell **fixe sombre** — ignore `next-themes` sur la carte.
- Labels `text-muted-foreground` parfois **faibles** sur fond clair carte.
- Modale retard : variables CSS OK en dark/light — **meilleure base** que login.

---

## Responsive

- Login `max-w-md` — correct mobile, **sous-exploite large desktop**.
- Modale `max-width: 26.5rem` — correct ; footer non sticky sur très petit écran (acceptable).

---

## Risques hydration

| Pattern | Fichier | Risque |
|---------|---------|--------|
| `window.location` dans `useEffect` | login | Faible — OK |
| `isLocalhostClient()` + prefill | login | Faible — après mount |
| `posCatalogueCount()` fallback SSR | login | Faible — constante |
| Pas de `Date.now()` au render | les deux | OK |
| Heure actuelle retard | gate | **À fournir côté API** (éviter `new Date()` client au premier paint) |

---

## Améliorations recommandées (implémentées)

1. **OrionAuthLayout** — split desktop, branding gauche, carte droite.
2. **OrionLoginCard**, **OrionAlert**, **OrionLogoBlock** — design system auth.
3. **OrionRadioCard** + **OrionEmployeeDelayCard** — modale RH premium.
4. Textes RH **humanisés** — validation requise, transmission RH.
5. **Framer Motion** léger (fade 8px, 180ms).
6. Carte login **theme-aware** (clair / sombre).
7. API gate : `poste`, `departement`, `currentTime` pour affichage sans hydration risk.
8. Bouton loading « Connexion en cours… » / « Validation en cours… ».
