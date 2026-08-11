# ANS ORION V3 — Actions humaines

**Date :** 2026-07-30

1. **Rotation des secrets** présents dans `.env.local` / backups locaux (mots de passe démo, NEXTAUTH_SECRET, ORION_V29_PASSWORDS_JSON). Ne pas committer.
2. **Décision métier Réclamations** pour le rôle `commercial` : aujourd’hui absentes du profil et de la permission-matrix. Soit ajouter module+permission, soit confirmer Direction-only (comportement actuel avec numérotation 1→5).
3. **Compléter `ORION_V29_PASSWORDS_JSON`** (local) : aujourd’hui seulement ADM01, CAI01, COM01 — ajouter OPE01, FIN01, LEC01, CAISSE01 pour E2E `role-access` complet. Ne pas committer.
4. **Attention** : si `E2E_EMAIL=demo@…`, les tests Admin utilisent automatiquement **ADM01** (V29) pour éviter un faux positif « admin = démo ».
5. **Validation cadences atelier** (temps & capacités) avant de figer les formules deadline en « vérité métier ».
6. **Conservation routes legacy** `/admin/*` : hub Organisation = `/administration/roles-permissions` ; `/admin/permissions` reste micro legacy.
7. **Init Git** optionnel pour versionner les remédiations (actuellement pas de dépôt).
8. Vérifier variables de **production** Hostinger/Neon sans les coller dans un ticket.
