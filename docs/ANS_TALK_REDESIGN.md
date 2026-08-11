# Refonte UI/UX — ANS Talk

Date : 24 juin 2026  
Portée : module messagerie uniquement (`components/ans-talk/`, `lib/ans-talk/`, `app/(app)/messagerie/`)

---

## 1. Problèmes identifiés (avant)

- Layout 3 colonnes basique, peu différencié
- Panneau contexte avec **cartes imbriquées** (`TALK_SHELL.panel2` + bordures)
- Couleurs zinc/noir isolées du design system ORION
- Liste conversations peu expressive (avatars seuls, badges faibles)
- Zone chat centrale peu valorisée, empty states pauvres
- Typographie hétérogène (`text-[9px]`, majuscules agressives)
- Panneau médias rigide et visuellement déconnecté

---

## 2. Principes appliqués

| Principe | Implémentation |
|----------|----------------|
| Anti card-in-card | Sections contexte = blocs plats + séparateurs, pas de cadres imbriqués |
| Cohérence ORION | Tokens `--orion-*`, `--text-*`, `.orion-text-*`, rouge ANS, or avertissements |
| Hub métier | Icônes type canal (Commande, BAT, Production…), chips contexte header |
| Grille premium | `.talk-workspace` CSS grid 280px / 1fr / 300px (contexte repliable) |
| Contexte modulaire | Onglets **Contexte · Fichiers · Actions** dans le panneau droit |
| Conversations premium | Badge type sur avatar, pill métier, barre active rouge, sections Épinglées/Récentes |

---

## 3. Architecture UX — V2 (24 juin 2026)

Inversion structurelle pour éviter le conflit avec la sidebar ORION (déjà à gauche).

```
┌─────────────────────────────────────────────────────────────┐
│ Topbar compacte — ANS Talk · lien Annonces                  │
├──────────────┬──────────────────────────┬───────────────────┤
│ Contexte     │ Zone chat (dominante)    │ Inbox             │
│ · onglets    │ · header une ligne       │ · recherche       │
│ · dossier    │ · messages + composer    │ · filtres         │
│ · fichiers   │                          │ · conversations   │
│ · actions    │                          │ (colonne droite)  │
└──────────────┴──────────────────────────┴───────────────────┘
```

Grille CSS : `context | 1fr | inbox` (248px latérales max).  
Mobile : contexte slide gauche, inbox slide droite, chat plein écran entre les deux.

### V2 — corrections visuelles
- Fonds unifiés `var(--orion-bg)` — plus d’effet module flottant
- Suppression gradients / grosses cartes englobantes
- Typo disciplinée : titres `text-sm`/`text-base`, meta `text-xs`
- Indicateur conversation active : barre **droite** (inbox à droite)
- Page messagerie `.ans-talk-page--flush` : compensation padding shell

### V1 (obsolète)
```
Conversations (gauche) | Chat | Contexte (droite)
```

---

## 4. Fichiers modifiés / créés

### Nouveau
- `lib/ans-talk/talk-visual.ts` — icônes & tons par type de conversation

### Refonte majeure
- `components/ans-talk/ans-talk.css` — design system scoped Talk
- `components/ans-talk/ans-talk-shell.tsx` — topbar premium
- `components/ans-talk/talk-conversation-list.tsx` — sidebar conversations
- `components/ans-talk/talk-conversation-item.tsx` — lignes premium
- `components/ans-talk/talk-conversation-header.tsx` — header + chips
- `components/ans-talk/ans-talk-context-panel.tsx` — onglets, blocs plats
- `components/ans-talk/talk-empty-state.tsx` — empty state hub métier
- `components/ans-talk/ans-talk-app.tsx` — grille workspace
- `components/ans-talk/talk-composer.tsx` — composer intégré
- `components/ans-talk/talk-message-list.tsx` — épinglés + empty chat
- `components/ans-talk/talk-message-bubble.tsx` — actions au hover
- `components/ans-talk/ans-talk-media-gallery.tsx` — mode embedded, tokens ORION
- `components/ans-talk/ans-talk-utils.tsx` — badges statut casse normale
- `components/ans-talk/talk-filters.tsx` — pills filtres

---

## 5. Non modifié (contraintes respectées)

- Routes `/messagerie`, APIs messaging, hook `useAnsTalk`
- Logique envoi messages, upload, réactions, tâches, appels
- Autres modules CRM / POS / Commandes / Backoffice
- `floating-messenger-bubble.tsx` + `floating-messenger-root.tsx` — widget réactivé dans le shell (hors `/messagerie`)
- `team-announcements-panel.tsx` + onglet Annonces — layout aligné topbar Talk

---

## 6. Validation manuelle recommandée

- [ ] Widget flottant : POS, dashboard, masqué sur `/messagerie`
- [ ] Annonces : `/messagerie?tab=annonces` — composer + fil plat

- [ ] Desktop : 3 colonnes, repli contexte (icône panneau)
- [ ] Mobile : liste ↔ chat ↔ contexte
- [ ] Filtres conversations (Commandes, BAT, Production…)
- [ ] Conversation liée commande : onglets Contexte + Actions
- [ ] Upload fichier + galerie onglet Fichiers
- [ ] Mode démo + mode connecté
- [ ] Mode clair / sombre
