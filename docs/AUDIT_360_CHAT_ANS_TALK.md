# AUDIT 360 — Phase 8 : Chat / ANS Talk / Collaboration

Date : 2026-07-04  
Références : `docs/ANS_TALK_REDESIGN.md`, règle projet : `/messagerie` plein écran (pas flottant seul)

---

## Architecture actuelle

| Composant | Fichier / API |
|-----------|---------------|
| UI | `app/(app)/messagerie/`, `components/ans-talk/` |
| API | `/api/messaging/*` (conversations, messages, upload, unread) |
| Modèles | TalkConversation, TalkMessage, TalkAttachment |
| Lien commande | `create-from-order` API ✅ |
| Deep link hub | Commande 360 → talkConversation |

---

## Problèmes identifiés

| ID | Priorité | Problème |
|----|----------|----------|
| T1 | P1 | Polling unread — charge serveur |
| T2 | P1 | Erreurs 401 intermittentes (`VERCEL_AUTH_AUDIT`) |
| T3 | P2 | Bulle flottante + page plein écran coexistence |
| T4 | P2 | Recherche/filtres conversations limités |
| T5 | P2 | Mobile : pièces jointes lourdes |
| T6 | P3 | Pas de WebSocket temps réel |

---

## Recommandations

**P1 :** Corriger auth messaging, backoff polling, retry UI  
**P2 :** Galerie médias par conversation, lien devis/BAT visible  
**P3 :** SSE/WebSocket, push notifications desktop

---

## Lien métier (obligatoire)

- Groupe auto par commande : `POST /api/messaging/conversations/create-from-order`
- Fichiers vers dossier commande : `talkAttachments` dans commande-360
- Ne jamais isoler messagerie sans retour hub commande

---

## Priorités sécurité

- Permissions conversation par membre
- Upload scan MIME
- Audit téléchargements (`TalkAttachmentDownload`)
