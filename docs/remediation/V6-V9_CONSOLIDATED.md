# Remédiation V6–V9 — rapport consolidé

Date : 2026-07-31 (reste intégré)

## Verdict

**~9.0/10** — P0/P1 + gaps restants (Plan matière, FIN-ACCESS, COM-HUB, inventaire) intégrés.
Pas 10/10 : découpage monolithe POS complet + E2E chaîne métier exhaustive.

## Correctifs intégrés (vague initiale)

### Sécurité P0

| ID | Correction |
|----|------------|
| STK-SEC-01/02 | Strip coûts BC + machines |
| STU-SEC-01 | BAT write |
| FIN-MARGIN/FISCAL | Marge finance + fiscal write |
| POS-03 | Sanitize price-preview |
| RH-P0-01→03 | Strip/gate paie + page-access |

### Métier / UX P1 (vague 1)

REC, CMD, CRM-02, PAN-02, LOG-PROOF, SH-01/02, ME-*, COM empty≠error, ADM 99+, Paie a11y

## Correctifs vague « reste » (cette session)

| ID | Correction |
|----|------------|
| **PROD-MAT-01** | Plan matière : parse `configSnapshot` (papier/encre), réservations stock, deep-link `?commande=`, label module « Plan matière », hub lien |
| **FIN-ACCESS-01** | Retrait livraison/lecture des pages factures/paiements ; UI création gated `factures:write` / `paiements:write` |
| **COM-HUB-01** | Banner + deep-link sur campagnes / relances / notifications ; filtre notifs par commande ; liens hub 360 |
| **STK-FEAT-01** | Onglet `/stock?tab=inventaire` + API `POST /api/stock/inventaire` + module `inventaire` |
| **CRM-01** (incrémental) | Extraction `ClientsKpiStrip` |
| **E2E** | Spec `e2e/remediation-reste-gaps.spec.ts` |

## Validations

- vitest `remediation-reste-gaps` + `page-access` + `remediation-v6-v9` PASS
- Local : http://127.0.0.1:3020

## Encore hors 10/10

- POS-01/02 découpage monolithe (~2700 L) — partiel via `components/pos/*`
- CRM-01 split complet clients-page
- E2E Playwright chaîne complète en CI
- PROD-MAT BOM multi-niveaux / conso auto production (v1 = besoins + résa)
