# V14 — Flux actuels vs cibles

## Actuel (problématique)

```text
Talk send → create message → link attachments (hors TX)
         → foreach member createNotification
         → each createNotification may email ALL prefs (fan-out)
GET messages → mark all unread as read
GET conversations → mutate memberships
CM notify → log statut=Envoyé (pas d’adaptateur)
```

## Cible Vague 1

```text
Talk send TX → message + attachments + outbox NotifyMembers
Worker → Notification + Receipt per member → email only that user if opt-in
mark-visible-through (POST) → receipts
list conversations → read-only membership
CM notify → NON_CONFIGURE | ASSISTE | real delivery
```
