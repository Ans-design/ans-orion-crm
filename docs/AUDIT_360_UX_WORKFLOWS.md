# AUDIT 360 — Phase 5 : UX / Ergonomie / Workflows

Date : 2026-07-04  
Références : `docs/USER_JOURNEYS.md`, `docs/FLOW_GLOBAL.md`, `docs/UX_AUDIT_GLOBAL.md`

---

## Flux audités

| Flux | Statut | Friction principale | Priorité |
|------|--------|---------------------|----------|
| Login | ✅ | — | — |
| Déclaration retard RH | ⚠️ | UX gate vs accès app | P1 |
| CRM → POS | ✅ | Sélection client parfois 2 clics | P2 |
| POS → panier | ✅ | Variables descriptives vs prix (lot récent) | P1 valider |
| Panier → devis | ✅ | Client obligatoire | OK |
| Devis → commande | ✅ | Snapshot acceptation | OK |
| Paiement / acompte | ⚠️ | Modal enrichi récent — tester | P1 |
| Commande → production | ⚠️ | Deep links OK, GPAO parfois vide | P1 |
| Production → livraison | ⚠️ | Preuve photo — OK | P2 |
| Livraison → facture | ⚠️ | Action manuelle générer facture | P1 |
| Backoffice prix → POS | ⚠️ | Drift si sync oubliée | P1 |
| RH présence → paie | ⚠️ | Module paie partiel | P2 |
| ANS Talk → dossier | ✅ | Groupe auto commande | P2 perf |

---

## 4 questions métier (règle projet)

Chaque écran doit répondre :
1. Où suis-je ?
2. Statut actuel ?
3. Prochaine action ?
4. Modules impactés ?

**Composant :** `flow-context-banner.tsx` — à généraliser P1.

---

## Score heuristique estimé (Nielsen, /10)

| Module | Score | Commentaire |
|--------|-------|-------------|
| Login | 8 | Clair |
| POS | 6 | Dense, courbe apprentissage |
| Commande 360 | 7 | Riche mais chargé |
| Backoffice | 5 | Expert-only |
| Dashboard | 7 | KPI utiles |
| ANS Talk | 6 | Polling, mobile |

**Moyenne globale : ~6.5/10** — objectif 8/10 post roadmap.

---

## Quick wins UX

- Bouton « action suivante » sur hub commande (existe partiellement)
- Toasts cohérents `uxToast`
- Labels statut paiement : Non payé / Acompte / Partiel / Soldé ✅
- Synthèse config `(descriptif)` / `(impact prix)` ✅
- Breadcrumbs univers sidebar

---

## Priorités

**P1 :** Paiement commande, sync prix, facture depuis commande, flow banner  
**P2 :** RH gate, GPAO empty states, mobile POS  
**P3 :** WalkMe-style onboarding
