# ADR — Annonces Team / RH / Ticker + couche receipts communes

**Statut :** Accepté (V14 Vague 3)  
**Contexte :** Trois modèles d’annonces coexistent (`TeamMessage`, `RhAnnouncement`, `TickerMessage`). Une fusion big-bang risque de casser RH / admin / shell.

## Décision

1. **Conserver** les trois modèles sources.
2. **Projeter** vers `Notification` + `NotificationReceipt` pour l’inbox personnelle (destinataires résolus explicitement).
3. Le ticker reste une surface ops filtrée par permission ressource — pas un substitut d’inbox.
4. Pas de suppression des tables legacy.

## Conséquences

- Pas de migration destructive.
- Readers UI : drawer sépare `active_alert` vs `personal`.
- Futures campagnes CM utilisent l’outbox V12, pas un 4ᵉ bus parallèle.
