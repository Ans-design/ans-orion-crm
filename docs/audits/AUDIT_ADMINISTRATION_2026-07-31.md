# ANS ORION — Audit approfondi : univers Administration

| Champ | Valeur |
|-------|--------|
| Date | 2026-07-31 |
| Univers | **Administration** (sidebar ordre 10) |
| Cible DOM | Bouton « Administration **99** » |
| Objectif | Collecte anomalies → roadmap **10/10** Backoffice SoT |
| Règle | Zéro suppression ; aliases legacy conservés |

## Score Administration : **7,0 / 10**

---

## 0. Lecture DOM « Administration 99 »

Ce n’est **pas** un compteur de menus.

Chaîne badge :

1. `useAdminMacroBadgeCounts` → `/api/admin-backoffice/overview`  
2. `unpublished` = drafts + unpublishedChanges  
3. `anomalies-critical`  
4. Somme des **clés uniques** → **`Math.min(total, 99)`**  
5. Affichage `99` = **plafond atteint** (≥ 99 alertes actionnables)

Poll : **180 s** + refresh visibility (acceptable).

Macros plates : overview · matières · prix-articles · formules · production · temps · org.

---

## 1. Scores macros

| Macro | Hub | Badge | Score |
|-------|-----|-------|------:|
| overview | `/administration/vue-ensemble` | unpublished | **7,5** |
| matieres | CPS `studio=matieres` | — | **7,0** |
| prix-articles | `/administration/prix-articles` | — | **7,0** |
| formules | CPS engines | unpublished | **7,0** |
| production | `/administration/production-flux` (+ sync) | — | **7,5** |
| temps | `/administration/estimation-temps` | — | **7,5** |
| org | `/administration/roles-permissions` | anomalies | **6,5** |

Gate : `canAccessAdministration` = admin \| manager — **OK**.

---

## 2. Findings

### P1

| ID | Finding | Reco |
|----|---------|------|
| ADM-P1-01 | Badge 99 = drafts/unpublished gonflés | Spliter compteurs ; UX « 99+ » ; auditer overview |
| ADM-P1-02 | Sync / Variables / Modèles peu visibles (micros) | Remonter liens / badges drift |

### P2

| ID | Finding | Reco |
|----|---------|------|
| ADM-P2-01 | Docs citent encore `/flux-statuts` | Canon `production-flux` |
| ADM-P2-02 | Doublon `/admin/permissions` legacy | Redirect / label |
| ADM-P2-03 | Clés badge matières/prix calculées mais non mappées macros | Brancher ou retirer mapping mort |
| ADM-P2-04 | Micro-studios packaging/photo hors nav plate | Doc discoverabilité |

### P3

| ID | Finding | Reco |
|----|---------|------|
| ADM-HIDDEN | Modules `admin_*` hidden avalés par macros | Conserver (zéro suppression) |

---

## 3. SoT / Sync / Flux (état)

| Thème | État |
|-------|------|
| Backoffice → DB → modules | Règle respectée |
| Centre sync | `/administration/synchronisation` OK ; discoverabilité faible |
| Flux & statuts | Canon `production-flux` ; alias `flux-statuts` conservé |
| Publication Brouillon→Actif | À rappeler ops |

---

## 4. Orphelins / conserver

| Élément | Action |
|---------|--------|
| `/admin-control`, `/admin/pricing` | Conserver redirects |
| `admin_*` hidden | Masqués, pas supprimés |
| CPS multi-alias | Conserver |

---

## 5. Besoins modernes

1. Badge drafts vs anomalies séparés  
2. Drift sync visible dans overview  
3. Onboarding admin « 7 macros »  
4. Audit log config filtrable  
5. Tests e2e publish catalogue  

---

## 6. Roadmap → 10/10

1. Investiguer why overview ≥ 99  
2. Remonter Sync + Variables  
3. MAJ docs flux-statuts  
4. Polish org dense  

---

## 7. Checklist 10/10

- [ ] Gate admin/manager (déjà)  
- [ ] Badge compréhensible (&lt; 99 ou 99+)  
- [ ] Sync / flux / modèles découvrables  
- [ ] Docs = routes canoniques  
- [ ] e2e : publish prix → POS  
- [ ] Aucune suppression alias  

---

*Téléchargeable.*
