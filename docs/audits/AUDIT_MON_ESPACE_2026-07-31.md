# ANS ORION — Audit approfondi : univers Mon espace

| Champ | Valeur |
|-------|--------|
| Date | 2026-07-31 |
| Univers | **Mon espace** (sidebar ordre 11 — dernier) |
| Cible DOM | Bouton « Mon espace » |
| Objectif | Collecte anomalies → roadmap **10/10** postes ops |
| Règle | Zéro suppression ; Pilotage ≠ exécution quotidienne |

## Score Mon espace : **6,5 / 10**

---

## 1. Architecture

```text
ROLE_PROFILES.nav → buildNavForRole → shouldSkipDuplicateWorkspaceLink
  → buildSidebarUniverses → MODULE_TO_UNIVERSE (ws_* → mon_espace)
```

Dedup domaine ↔ workspace : **OK** (un seul lien UI).

---

## 2. Inventaire (12 modules)

| Module | Route | Home rôles | Score qualité |
|--------|-------|------------|---------------|
| `ws_accueil` | `/workspace/accueil` | accueil | 6,0 |
| `ws_commercial` | `/workspace/commercial` | commercial | 6,0 |
| `ws_production` | `/workspace/production` | production | 5,0 |
| `ws_studio` | `/workspace/studio` | designer | **7,5** |
| `ws_finance` | `/workspace/finance` | caisse | 5,5 |
| `ws_cm` | `/workspace/cm` | cm | 4,0 |
| `ws_logistique` | `/workspace/logistique` | livraison | 5,0 |
| `ws_magasin` | `/workspace/magasin` | *(pas de rôle dédié)* | **4,0** |
| `ws_faconnage` | `/workspace/faconnage` | faconnage | 5,0 |
| `ws_conducteur` | `/workspace/conducteur` | conducteur | 5,5 |
| `ws_maintenance` | `/workspace/maintenance` | technicien | 5,0 |
| `rh_mon_profil` | `/rh/mon-profil` | ops | **4,5** |

---

## 3. Findings

### P1

| ID | Finding | Reco |
|----|---------|------|
| ME-01 | Univers **toujours dernier** alors que home ops = workspace | Remonter / pin pour non-direction |
| ME-02 | `ws_magasin` sans rôle + KPIs `production` | Profil magasin + stats stock |

### P2

| ID | Finding | Reco |
|----|---------|------|
| ME-03 | Pas de `UNIVERSE_MODULE_ORDER.mon_espace` | Ordre canonique |
| ME-04 | Ghost `ws_*` dans order-lists autres univers | Nettoyer listes |
| ME-05 | Director sans `rh_mon_profil` dans whitelist Mon espace | Ajouter |
| ME-06 | Rôle `lecture` : Mon espace vide | Au moins profil |
| ME-07 | Commercial charge `/api/reports` lourd | KPI léger |
| ME-08 | Palette sans `moduleAccess` | Aligner sidebar |

### P3

| ID | Finding | Reco |
|----|---------|------|
| ME-09 | Emojis headers | Design system |
| ME-10 | Peu de tests par rôle | Vitest whitelist |

---

## 4. Overlaps (ne pas supprimer)

| Élément | Action |
|---------|--------|
| `ws_*` dans Production/Stock/… order-lists | Fantômes doc — runtime OK via override |
| Dedup skip | Conserver |
| Home routes | Alignées dashboard-registry |

---

## 5. Besoins modernes

1. Mon espace en tête pour ops  
2. Cockpits KPI légers (pas full reports)  
3. Magasinier dédié  
4. Favoris syncés (voir Shell)  
5. e2e landing par rôle  

---

## 6. Roadmap → 10/10

1. Position sidebar + magasin  
2. Order-list + ghost cleanup  
3. KPI légers + lecture profil  
4. Tests rôles  

---

## 7. Checklist 10/10

- [ ] Ops landent sur workspace (déjà)  
- [ ] Mon espace visible / prioritaire ops  
- [ ] Pas de doublon domaine/workspace (déjà)  
- [ ] Magasin cohérent  
- [ ] mon-profil page-access (voir RH)  
- [ ] e2e home par rôle  
- [ ] Aucune suppression ws_*  

---

*Téléchargeable — paire : `AUDIT_SHELL_CHROME_2026-07-31.md`.*
