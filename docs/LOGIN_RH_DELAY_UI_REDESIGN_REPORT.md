# Refonte UI — Login & Déclaration de retard RH

**Date :** 2026-06-24  
**Statut :** Intégré

---

## 1. Fichiers modifiés

| Fichier | Changement |
|---------|------------|
| `app/login/page.tsx` | Layout split premium, OrionAuth*, alertes, loading text |
| `components/auth/late-arrival-gate.tsx` | Refonte complète UI + copy humanisée |
| `lib/services/late-arrival-service.ts` | `poste`, `departement`, `currentTime` dans gate |
| `styles/design-tokens.css` | Auth background, tokens dark login card |
| `styles/late-arrival-modal.css` | Largeur modale 28rem |
| `components/orion/index.ts` | Exports auth |

## 2. Composants créés (`components/orion/auth/`)

| Composant | Rôle |
|-----------|------|
| `OrionAuthBackground` | Fond gradient + grille + orbes |
| `OrionAuthLayout` | Split desktop / mobile centré |
| `OrionLogoBlock` | Branding + phrase valeur + modules |
| `OrionLoginCard` | Carte formulaire animée |
| `OrionAlert` | Info / warning / error / success |
| `OrionRadioCard` / `OrionRadioCardGroup` | Options cause retard premium |
| `OrionEmployeeDelayCard` | Carte employé + badge retard |
| `OrionAuthFormField` | Labels/hints carte login |
| `OrionPasswordInput` | Mot de passe auth + show/hide |
| `OrionButton` | CTA primary/gold auth |

## 3. Compléments finaux (100 %)

- Champs login via `OrionAuthFormField` + `OrionPasswordInput` + `OrionButton`
- Commentaire retard **visible uniquement si « Autre »** (+ validation requise)
- Animation succès check 220 ms avant fermeture gate
- Footer modale **sticky** sur mobile
- Shake léger sur erreur champ login (`orion-auth-field-shake`)

- Login et retard RH **même famille visuelle** (bleu nuit, accent ANS).
- Session expirée : message **doux et professionnel**.
- Ton RH : « Validation requise » au lieu de « Accès suspendu ».
- Carte login **theme-aware** (clair / sombre).
- Heure actuelle fournie **côté serveur** (pas de hydration risk).
- Boutons loading explicites (« Connexion en cours… »).

## 4. Structure login

**Desktop :** gauche branding ORION + modules CRM/POS/GPAO/Finance/RH — droite carte connexion.  
**Mobile :** logo compact + carte centrée.

## 5. Structure déclaration retard

1. Header icône + titre  
2. `OrionAlert` warning RH  
3. `OrionEmployeeDelayCard` (nom, matricule, poste, heures, badge +N min)  
4. `OrionRadioCardGroup` avec icônes Lucide + descriptions  
5. Commentaire animé (souligné si « Autre »)  
6. Footer CTA « Valider et accéder à l'application »

## 6. Accessibilité

- Labels associés, `aria-invalid`, `aria-describedby`
- Radio `sr-only` + focus ring sur carte
- `role="dialog"`, `aria-modal`, `aria-labelledby`
- Touch targets ≥ 44px sur démo / CTA

## 7. Responsive

- Split `lg:` breakpoint
- Modale scrollable `max-height: 92vh`
- Branding mobile compact (`.orion-logo-extended` masqué)

## 8. Tests réalisés

```bash
npm run typecheck
npm run test
```

Tests manuels recommandés : `/login`, session_expired, retard RH, dark/light, mobile.

## 9. Risques restants

- Gate retard : test manuel nécessite employé lié + pointage retard seedé.

---

Voir aussi `docs/LOGIN_RH_DELAY_UI_AUDIT.md`.
