# Registre exigences techniques à valider — V2-02R

| Date | 2026-07-18 |
|------|------------|
| Règle | **Ne rien inventer** (DPI, ICC, PDF/X, % stock, textes CGV…) |

## Techniques print (H08)

| Paramètre | Présent V17 ? | Dans ORION | Décision |
|-----------|---------------|------------|----------|
| DPI / résolution | Thème seul | Fiches à créer | **À valider techniquement** |
| Fond perdu / marges | Thème | Partiel config | À valider |
| Profil ICC / PDF/X | Absent chiffré | — | Ne pas coder de défaut inventé |
| Tolérances machine | Exemples non universels | Machines + manuels | Par équipement approuvé |
| AnyCut / angles lame | Exemple | — | Fiche machine, pas global |

## Stock (H06)

| Règle | État |
|-------|------|
| Alerte = minQty configurable | **OK** (pas 20% dur) |
| Unités / conversion | Partiel StockItem |
| Délai fournisseur | À densifier |
| Consommation production | **OK D-011** — réservations consommées sur Prête / Livré, idempotent |
| Inventaire / valorisation | Partiel |

## Finance / Mobile Money (H09)

| Règle | État |
|-------|------|
| Capture client ≠ preuve fonds | Documenté — rapprochement requis |
| Anti-doublon référence | **OK** V2-06 |
| Remboursement tracé | Type Remboursement présent |
| MFA SSI (H07) | **À valider** — pas forcé |

## Juridique / RH / HSE

| ID | Exigence | Validation requise | Codage |
|----|----------|-------------------|--------|
| C02 | Horaires / HS | Juriste | Config seulement |
| C03 | Sanctions | — | **Interdit auto** |
| C04 | Pièce ID | DPO / juriste | Minimisation |
| C05 | HSE conforme | HSE terrain | Pas de badge conforme |
| C06 | CGV/BAT | Juriste | Version + preuve acceptation |
| H01 | Maîtrise doc | Direction | Familles DOC-* |
| H10 | RTO/RPO | Direction IT | Backup Hostinger |

## KPI (H11) — dictionnaire minimal

| Code | Nom | Source | Formule (à confirmer) | État |
|------|-----|--------|----------------------|------|
| KPI-OTD | Commandes à temps | Commande.dateLiv | livrées dans délai / total | incomplet |
| KPI-REPRINT | Reprints | Qualité / reclamations | count reprints | à valider |
| KPI-STOCK | Stock critique | StockItem | dispo ≤ minQty | présent |
| KPI-DOWN | Arrêt machine | Maintenance | durée tickets | incomplet |
| KPI-DIGITAL | Leads digitaux | CM / clients canal | convertis | incomplet |

## Identifiants (6R.6)

| Couche | ORION |
|--------|-------|
| PK technique | cuid Prisma |
| Réf humaine | `nextSequenceSafe` (CMD, FAC, PAY…) |
| Fuseau affichage | Indian/Antananarivo (à confirmer UI) |
| Format `#AA_MM_JJ_CXX` | Non PK — option affichage configurable |

## Bloquants avant GO PRODUCTION

1. Backup PG restaurable  
2. PDF V17 déposés + relecture page à page  
3. Validation C01–C06 / juriste-HSE  
4. Consommation stock production branchée + testée  
