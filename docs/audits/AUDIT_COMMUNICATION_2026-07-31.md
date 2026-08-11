# ANS ORION — Audit approfondi : univers Communication

| Champ | Valeur |
|-------|--------|
| Date | 2026-07-31 |
| Univers | **Communication** (sidebar ordre 6) |
| Cible DOM | Bouton « Communication » (souvent **sans** chiffre) |
| Objectif | Collecte anomalies → roadmap **10/10** |
| Règle | Zéro suppression ; ANS Talk = plein écran `/messagerie` uniquement |

## Score Communication : **5,9 / 10**

---

## 0. Badge parent

| Observation | Interprétation |
|-------------|----------------|
| Si chiffre visible | **`ansTalk`** = messages non lus (`equipe_messages`) |
| Autres modules CM | Pas de clé badge |
| FAB bas-droite | → `/messagerie` **uniquement** (pas de panneau flottant) |
| `historique` | **Hors** Communication → Pilotage (`rapports_analyse`) |

`ws_cm` dans order-list → **Mon espace**.

---

## 1. Cartographie & scores

| # | Module | Route | Score |
|---|--------|-------|------:|
| 1 | `equipe_messages` | `/messagerie` (+ alias `/equipe/messages`) | **8,0** |
| 2 | `equipe_suggestions` | `/equipe/suggestions` | **6,0** |
| 3 | `cm_campagnes` | `/cm/campagnes` | **5,5** |
| 4 | `cm_relances` | `/cm/relances` | **5,5** |
| 5 | `cm_notifications` | `/cm/notifications` | **5,5** |
| 6 | `aide` | `/aide` | **4,5** |
| 7 | `ws_cm` | `/workspace/cm` | **4,0** |

---

## 2. Findings

### P1

| ID | Finding | Reco |
|----|---------|------|
| COM-ACCESS-01 | `/cm/*` sans page-access ; API exige `cm:read/write` | Aligner rôles |
| COM-EMPTY-01 | Campagnes / relances / notifs sans Empty/Error retry | États UI |
| COM-HUB-01 | CM sans deep-link `/commandes/[id]` | Banner + liens |

### P2

| ID | Finding | Reco |
|----|---------|------|
| COM-PERF-01 | Listes CM non paginées | take + page |
| COM-OVERLAP-01 | Annonces `/api/equipe/messages` vs messaging Talk | Doc dualité |
| COM-AIDE-01 | Aide = liens statiques | FAQ / search |
| COM-WS-01 | `ws_cm` shell léger | Enrichir KPIs CM |

### P3

| ID | Finding | Reco |
|----|---------|------|
| COM-BADGE | aria « N messages non lus » | Label |
| COM-HIST | historique déjà sorti | Conserver hors CM |

---

## 3. Modules — synthèse

| Module | Déjà bien | Ouvert |
|--------|-----------|--------|
| ANS Talk | Auth, create-from-order, context panel, FAB→messagerie, poll 60s | Search globale, typing |
| Suggestions | CRUD votes | SLA direction |
| Campagnes | API cm:* | Pas d’analytics / publication réelle |
| Relances | Templates | Pas d’envoi réel / lien devis |
| Notifications | Pending métier | WhatsApp log only ; pas hub |
| Aide | Liens | Contenu pauvre |
| ws_cm | Cockpit | Shell |

---

## 4. Orphelins / masquer / conserver

| Élément | Action |
|---------|--------|
| `/equipe/messages` → messagerie | Conserver redirect |
| Historique | Déjà Pilotage — OK |
| FAB Talk | Ne jamais rouvrir panneau flottant |
| Aide dans Communication | Conserver ou soft-group « Support » |

---

## 5. Besoins modernes

1. Relances auto devis/facture avec deep-link  
2. Gateway WhatsApp/SMS réel  
3. Calendrier éditorial campagnes  
4. Notifications → hub commande  
5. Centre d’aide searchable par rôle  

---

## 6. Roadmap → 10/10

1. page-access + empty/error CM  
2. Deep-links notifications  
3. Badge optionnel « relances dues »  
4. Enrichir aide / intégrations (sans supprimer)

---

## 7. Checklist 10/10

- [ ] page-access CM = permissions  
- [ ] Empty/Error sur toutes listes CM  
- [ ] Notifications → `/commandes/[id]`  
- [ ] Talk FAB → messagerie only (déjà)  
- [ ] Historique hors CM (déjà)  
- [ ] e2e Talk + relance lecture  
- [ ] Aucune suppression route

---

*Téléchargeable.*
