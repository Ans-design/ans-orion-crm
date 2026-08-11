# Stock & Finance — synchronisation

## Flow stock

### Types de stock

| Type | Description |
|------|-------------|
| Disponible | Quantité libre |
| Réservé | Affecté à commande / GPAO |
| Consommé | Sortie validée production |
| Faible | Sous seuil alerte |
| Rupture | Sous seuil critique |

### Déclencheurs

| Événement | Action stock |
|-----------|--------------|
| Devis → Commande | Vérifier + réserver |
| Stock insuffisant | Alerte + proposer achat `/achats` |
| Production démarre | Confirmer consommation prévue |
| Production termine | Valider consommation réelle |

Service : `commande-stock-workflow.ts`

### Configuration Backoffice

- Matière liée, grammage, format, laize
- Formule de consommation
- Seuils alerte / rupture  
→ `/administration/matieres`, `/administration/stock`

---

## Flow finance

```
Commande → Facture → Paiement → Caisse → Marge → Historique client
```

### Fonctions

| Fonction | Route / Service |
|----------|-----------------|
| Facture liée commande | `facture-workflow-service.ts` |
| Paiement lié facture | `/paiements` |
| Reste à payer | fiche facture |
| Coût matière / production | `/finance/couts-revient` |
| Marge estimée / réelle | `/finance/charges` |

### Statuts finance

Non facturé → Facturé → Partiellement payé → Payé → En retard → Annulé

### Action suivante

| Situation | Action |
|-----------|--------|
| Livraison terminée | Générer facture |
| Facture impayée | Relancer `/cm/relances` |
| Paiement complet | Clôturer dossier commande |

---

## Lien Stock ↔ Production ↔ Finance

```
Commande confirmée
  → réservation stock
  → dossier GPAO
  → consommation réelle (production)
  → livraison
  → facture (CA)
  → marge (coûts matière + production)
```

Matrice complète : `docs/SYNC_MATRIX.md`
