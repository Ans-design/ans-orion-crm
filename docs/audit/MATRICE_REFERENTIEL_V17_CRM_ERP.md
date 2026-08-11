# Matrice référentiel V17 → CRM/ERP — Vague 2 (V2-02R)

| Date | 2026-07-18 |
|------|------------|
| PDF V17 | **MANQUANTS** dans Cursor / Downloads — exigences tirées du prompt enrichi + audit 51/100 |
| Hiérarchie | Propriétaire > validation juridique/HSE > données prod > spec logicielle > V17 > seeds |

## Constats critiques — ne pas coder aveuglément

| ID | Constat | État logiciel | Action |
|----|---------|---------------|--------|
| C01 | Mélange documentaire RI/CGV/HSE/RH | Module docs partiel | Séparer familles DOC-* — **à valider** |
| C02 | Horaires / paie ambiguës | RH présence existante | Calendriers **configurables** — **à valider juridiquement** |
| C03 | Sanctions automatiques | — | **Interdit** — incidents humains seulement |
| C04 | Données perso / pièce ID | Livraison/RH | Minimisation — **à valider** |
| C05 | HSE « conforme » | Module partiel | Ne pas afficher conforme — **à valider HSE** |
| C06 | CGV/BAT décharge absolue | BAT + acceptation | Preuve versionnée — textes **à valider** |

## Traçabilité exigences (extrait — source prompt V17)

| ID | Besoin métier | Module ORION | Source officielle | Permission | État |
|----|---------------|--------------|-------------------|------------|------|
| V17-W1 | Accueil / contact | clients, accueil, CM | Client + canal | clients:write | présent mais incomplet |
| V17-W2 | Enregistrement + référence | devis/commandes | SequenceService + cuid | devis:write | implémenté et testé (partiel) |
| V17-W3 | Dispatching | production/planning | Commande + GPAO | production:write | présent mais incomplet |
| V17-W4 | PAO / BAT | bat, studio | BAT + FileAsset | bat:write | présent mais incomplet |
| V17-W5 | Impression | production | dossier étapes | production:write | présent mais incomplet |
| V17-W6 | Façonnage | faconnage workspace | étapes GPAO | production:write | présent mais incomplet |
| V17-W7 | Contrôle qualité | qualite | ProductionDossierEtape | production:write | présent mais incomplet |
| V17-W8 | Sortie / paiement / livraison | caisse, paiements, livraisons | Paiement + Livraison | paiements / livraisons | présent mais incomplet |
| V17-E1 | Fichier non conforme | BAT / fichiers | motif + blocage | bat:write | planifié |
| V17-E2 | Rupture stock | stock | reservedQty + alerte minQty | stock:* | présent mais incomplet |
| V17-E3 | Machine panne | maintenance | tickets | — | présent mais incomplet |
| V17-E4 | Reprint / CQ refusé | qualité | non-conformité | production | planifié |
| V17-E5 | Paiement douteux MM | paiements | référence + rapprochement | paiements:write | présent mais incomplet (V2-06 idempotence) |
| V17-E6 | Livraison échouée | livraisons | statut + replanif | livraisons:write | présent mais incomplet |
| V17-E7 | Réclamation | reclamations | SLA | commandes | présent mais incomplet |
| V17-F1 | Caisse quotidienne | CashSession | open/close + sessionId | pos:close_register | implémenté et testé (partiel V2-06) |
| V17-F2 | Stock alerte ≠ 20% | StockItem.minQty | configurable | stock:write | confirmé code (pas 20% dur) |
| V17-F3 | Réservation / release | StockReservation | active→released | — | **implémenté V2-02R** (release) ; conso prod absente |
| V17-ID1 | Ref humaine ≠ PK | Sequence + cuid | Commande.numero | — | confirmé code |
| V17-DOC | Maîtrise documentaire | — | — | — | à valider / absent |
| V17-HSE | Registre HSE | — | incidents seulement | — | à valider HSE |
| V17-KPI | KPI dictionnaire | dashboard | sources DB | rapports:read | présent mais incomplet |

## Circuit 8 étapes — mapping code

| Étape V17 | Propriétaire rôle ORION | Statut / jalon | Blocage typique |
|-----------|-------------------------|----------------|-----------------|
| 1 Accueil | `accueil`, `cm`, `commercial` | Client créé | — |
| 2 Enregistrement | `commercial`, `accueil` | Devis / Commande | devis expiré |
| 3 Dispatch | `manager`, `conducteur` | À planifier | stock / BAT |
| 4 PAO/BAT | `designer`, `technicien` | bat_envoye / bat_approuve | fichier non conforme |
| 5 Impression | `production`, `conducteur` | En production | panne / matière |
| 6 Façonnage | `faconnage` | En finition | — |
| 7 CQ | `production` | Prête (si CQ OK) | CQ refusé |
| 8 Sortie | `caisse`, `livraison` | Livré | reste > 0 |

## Exceptions → transitions

Documentées dans `MATRICE_STATUTS_TRANSITIONS_ANS.md`. Production bloquée si stock non prêt (`stockReady` workflow).

## PDF à fournir

Placer en lecture seule dans `docs/references/` :

- `ANS_Design_Print_Referentiel_AZ_V17_Complet_Enrichi.pdf`
- `Audit_Complet_Referentiel_ANS_V17.pdf`

Puis densifier cette matrice page par page.
