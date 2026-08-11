# ANS ORION — Index audits univers (téléchargement complet)

| Date | Univers / surface | Score | Fichier |
|------|-------------------|------:|---------|
| 2026-07-30 | Pilotage | 5,5 → remédié V5 | `AUDIT_PILOTAGE_2026-07-30.md` + `PILOTAGE_*` |
| 2026-07-31 | Commercial | **6,6** | `AUDIT_COMMERCIAL_2026-07-31.md` |
| 2026-07-31 | Stock & Achats | **6,2** | `AUDIT_STOCK_ACHATS_2026-07-31.md` |
| 2026-07-31 | Studio & BAT | **6,8** | `AUDIT_STUDIO_BAT_2026-07-31.md` |
| 2026-07-31 | Production | **6,4** | `AUDIT_PRODUCTION_2026-07-31.md` |
| 2026-07-31 | Communication | **5,9** | `AUDIT_COMMUNICATION_2026-07-31.md` |
| 2026-07-31 | Logistique | **6,5** | `AUDIT_LOGISTIQUE_2026-07-31.md` |
| 2026-07-31 | Finance | **6,1** | `AUDIT_FINANCE_2026-07-31.md` |
| 2026-07-31 | **RH** | **6,2** | `AUDIT_RH_2026-07-31.md` |
| 2026-07-31 | **Administration** | **7,0** | `AUDIT_ADMINISTRATION_2026-07-31.md` |
| 2026-07-31 | **Mon espace** | **6,5** | `AUDIT_MON_ESPACE_2026-07-31.md` |
| 2026-07-31 | **Shell chrome** | **7,0** | `AUDIT_SHELL_CHROME_2026-07-31.md` |
| 2026-07-30 | Vue globale | — | `AUDIT_MODULES_COMPLET_2026-07-30.md` |

## Moyenne indicative

Univers métier (hors Pilotage remédié / shell) : environ **6,4 / 10**.

---

## Badges sidebar (lexique)

| Univers | Exemple | Signification |
|---------|---------|---------------|
| Commercial | 6 | Somme devis+commandes+réclamations |
| Stock | 6 | Alertes stock |
| Production | **54** | Tâches métier ouvertes (tous types) |
| Administration | **99** | Cap `min(drafts+unpublished+anomalies, 99)` |
| Communication | — | Unread Talk si &gt; 0 |
| Logistique | — | Livraisons actives |
| Finance / RH / Studio / Mon espace | — | Souvent 0 |

---

## Top P0 encore ouverts (tous univers)

| ID | Univers | Problème |
|----|---------|----------|
| STK-SEC-01 | Stock | Fuite unitCost liste BC |
| STU-SEC-01 | Studio | Designer bat:write ≠ production:write |
| FIN-MARGIN-01 | Finance | Rôle finance vs strip coûts |
| RH-P0-01/02 | RH | Salaires API employés + PATCH |
| RH-P0-03 | RH | page-access mon-profil / absences |
| LOG-PROOF-01 | Logistique | Livré dispatch sans preuve UI |
| PROD-MAT-01 | Production | Plan matière non métier |
| SH-01 | Shell | Notifs = audit logs |

---

## Ordre de remédiation suggéré (après audits)

1. **Sécurité P0** : Stock · Studio · Finance · RH  
2. **Ops critiques** : Logistique preuve · Production page-access  
3. **Shell** : notifs + thème mobile + panier rôle  
4. **Commercial** POS/SAV · Communication empty/access  
5. **Admin** badge 99 / sync discoverability · Mon espace position  

Règle : **audit (fait) → remédiation → preuve → 10/10 univers par univers**.
