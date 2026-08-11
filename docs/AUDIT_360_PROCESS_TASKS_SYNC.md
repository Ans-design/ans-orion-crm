# AUDIT 360 — Phase 10 : Flux / Tâches / Processus / Sync

Date : 2026-07-04  
Références : `docs/FLOW_GLOBAL.md`, `docs/PRODUCTION_FLOW.md`, `docs/SYNC_MATRIX.md`

---

## Chaîne métier cible

```
Client → Devis → BAT → Commande → GPAO → Stock → Production → CQ → Livraison → Facture → Paiement
```

Hub : `/commandes/[id]` — `commande-360-service.ts`, `next-action.ts`

---

## Statuts incohérents (P1)

| Zone | Risque | Action |
|------|--------|--------|
| Facture vs paiement commande | Drift si pas resync | ✅ `syncCommandeLinkedFacturesFromPayments` |
| Commande statut vs GPAO | Multiples sources | Single snapshot workflow |
| Devis expiré vs panier | Cron expiration | Vérifier cron actif |
| Stock réservé vs prod consommée | Double comptage | Matrice sync P1 |

---

## Tâches / automatisations utiles

| Automatisation | Déclencheur | Priorité |
|----------------|-------------|----------|
| Créer dossier GPAO | Commande confirmée | P1 ✅ partiel |
| Groupe Talk commande | Commande créée | P1 ✅ |
| Proposer facture | Livraison terminée | P1 |
| Relance devis | J+7 sans réponse | P2 |
| Alerte stock bas | Post prod | P1 |
| Sync prix POS | Publication backoffice | P1 |

---

## Risques d’erreur process

1. Paiement sur facture sans update commande — mitigé par sync bidirectionnelle
2. Prix POS ≠ devis accepté — snapshot + figer lignes
3. BAT non validé → production — blocages commande (`CommandeBlocagePanel`)

---

## Priorités

**P0 :** Paiement/prix exacts  
**P1 :** Workflow commande unique, sync facture, stock  
**P2 :** Relances, notifications automatiques  
**P3 :** n8n / Make orchestration externe
