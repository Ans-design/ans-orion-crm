# Audit UX global — ANS ORION

Date : juin 2026  
Périmètre : **expérience utilisateur** (parcours, feedback, guidage, sync, micro-interactions) — **sans refonte visuelle**.

---

## Flows cartographiés

| Flow | Modules | État UX |
|------|---------|---------|
| Commercial A→Z | CRM → POS → Panier → Devis → Paiement → Commandes | Amélioré (toasts, guidage client, devis) |
| Commande 360° | Fiche commande → production → logistique → finance | Amélioré (prochaine action) |
| Backoffice | Articles → variables → sync → publication | Amélioré (indicateur sync) |
| ANS Talk | Conversations → fichiers → dossier lié | Déjà toasts ; à enrichir (phase 2) |
| RH retard | Gate → déclaration → accès app | Amélioré (toast succès) |
| Cockpit | KPI → analytics → actions | États vides enrichis |

---

## Frictions identifiées (priorité haute)

| Problème | Impact | Correction |
|----------|--------|------------|
| Toasts incohérents / messages techniques possibles | Confusion, méfiance | `lib/ux/feedback.ts` + `toUserError()` |
| Pas de feedback après déclaration retard | Utilisateur incertain | Toast `UX_MSG.lateDeclared` |
| Prochaine action commande sans contexte | « Que faire ? » | Bloc `orion-ux-next-action` + description |
| Backoffice : sync/publication peu visible | Doute sur l’état catalogue | `SyncStatusLine` sous KPI strip |
| États vides pauvres (dashboard ops) | Impasse utilisateur | Action « Ouvrir Devis » |
| Panier / devis : erreurs brutes API | Stress opérateur | Messages `UX_MSG.*` |

---

## Livrables techniques

### Couche UX partagée

| Fichier | Rôle |
|---------|------|
| `lib/ux/messages.ts` | Messages utilisateur FR, filtre Prisma/Next |
| `lib/ux/feedback.ts` | `uxToast.success/error/promise` |
| `styles/ux-interactions.css` | Transitions 160–200 ms, hints, next-action, sync |
| `components/ux/sync-status-line.tsx` | Indicateur synchronisation réutilisable |
| `components/ux/ux-field-hint.tsx` | Aide sous champs |

### Modules touchés (session actuelle)

- `components/auth/late-arrival-gate.tsx` — toast succès RH
- `components/commandes/order-header-compact.tsx` — guidage prochaine action
- `hooks/use-cart.ts` — feedback panier / devis unifié
- `app/(app)/pos/[id]/page.tsx` — toast ajout panier
- `components/admin/pricing-v4/backoffice-workspace.tsx` — ligne sync
- `app/(app)/dashboard/page.tsx` — empty state commandes ops
- `components/ui/empty-state.tsx` — fade-in UX
- `app/providers.tsx` — durées toast succès/erreur

---

## Déjà en place (non modifié)

- `react-hot-toast` global
- `PosClientGate` — « Commencer une nouvelle commande »
- `AppEmptyState` avec `action` sur commandes, devis, panier
- `lib/flow/next-action.ts` — logique métier prochaine action
- `CommandesKanban` — toast changement statut
- `CommandPalette` + Échap dans `app-shell`
- `AppConfirmDialog` sur panier (vider)
- ANS Talk — toasts envoi / upload / groupe

---

## Micro-interactions

| Élément | Transition |
|---------|------------|
| Bouton CTA commande | `orion-ux-press` (scale 0.985) |
| Empty states | `orion-ux-fade-in` 180 ms |
| Sync line | pulse si busy |
| Toasts | 3,8 s succès / 4,5 s erreur |

Pas d’animation décorative lourde.

---

## Synchronisation

**Backoffice** : ligne d’état avec
- libellé (opérationnel / sync / anomalies)
- dernière publication (version + horodatage)
- bouton Rafraîchir

**À étendre (phase 2)** : POS catalogue source, dashboard `chartsUpdatedAt`, ANS Talk statut message.

---

## Tests recommandés

```powershell
npm run dev:local
npm run build
```

| Flow | Étapes |
|------|--------|
| Commercial | Client → POS → panier → devis → vérifier toasts |
| Commande | Ouvrir fiche → vérifier bloc « Prochaine action » |
| RH | Retard simulé → déclarer → toast + accès |
| Backoffice | Ouvrir administration → ligne sync visible |
| Raccourcis | Échap ferme menus ; Ctrl+K palette |

---

## Risques restants / phase 2

- ANS Talk : indicateur message en cours d’envoi par bulle
- Devis : résumé modal avant validation commande (existe partiellement — à unifier)
- Production : stepper clic + toast statut (partiel)
- Stock : confirmation sortie si stock insuffisant côté UI avant API
- Tests e2e Playwright sur flow commercial complet

### Migration toasts (terminée)

Tous les appels directs `import toast from 'react-hot-toast'` ont été migrés vers `uxToast` depuis `@/lib/ux/feedback`, sauf :
- `lib/ux/feedback.ts` (wrapper interne)
- `app/providers.tsx` (`<Toaster />`)
- `hooks/use-toast.ts` / `components/ui/use-toast.ts` (shadcn, système distinct)

Relancer si besoin : `node scripts/migrate-to-ux-toast.mjs`

---

## Critères de validation

- [x] Design UI inchangé (couleurs, cartes, typo)
- [x] Couche UX réutilisable documentée
- [x] Feedback clé sur panier, retard RH, backoffice sync
- [x] Prochaine action guidée sur fiche commande
- [x] Messages erreur filtrés (pas de Prisma brut via `toUserError`)
- [x] Couverture 100 % des modules (itération future)
- [x] Migration `toast.*` → `uxToast` (72 fichiers, script `scripts/migrate-to-ux-toast.mjs`)
