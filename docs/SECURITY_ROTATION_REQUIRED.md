# Rotation des secrets requise — ANS ORION

Date : 2026-07-30  
Contexte : audit correction P0 — secrets locaux / exports ZIP / littéraux retirés du code.

**Ne jamais coller d’anciennes ou nouvelles valeurs dans ce document.**

## Types de secrets à faire tourner

| Type | Emplacement logique | Procédure générale |
|------|---------------------|--------------------|
| `NEXTAUTH_SECRET` / `AUTH_SECRET` | Env Hostinger / Vercel / `.env.local` | Générer ≥64 car. aléatoires ; redéployer ; invalider sessions |
| `DATABASE_URL` | Env prod / preview | Rotation credentials Postgres ; mettre à jour env ; smoke test connexion |
| `SETUP_SECRET` | Env non-prod uniquement | ≥32 car. ; ne jamais activer setup-db en prod |
| `LOCAL_ADMIN_PASSWORD` | `.env.local` seulement | Mot de passe fort ≥8 ; pas de fallback code |
| `DEMO_*_PASSWORD` / `E2E_PASSWORD` | Env démo / CI | Régénérer ; mettre à jour secrets CI |
| `ORION_V29_PASSWORDS_JSON` | Env local / seed | JSON matricule→mdp ; régénérer si fuite |
| Tokens Hostinger / FTP / API | Panel Hostinger + env | Révoquer anciens tokens ; créer neufs |
| Backups `.env.backup-*` sur disque | Machine développeur | Supprimer ou chiffrer hors repo ; traiter comme compromis si ZIP partagé |

## Fichiers locaux (non Git) à surveiller

Présents sur le poste (noms uniquement) : `.env.local`, `.env.integrations`, `.env.audit.local`, plusieurs `.env.backup-*`.  
Ils sont couverts par `.gitignore` — **ne pas les inclure dans un ZIP de livraison**.

## Checklist après rotation

1. `npm run typecheck` et smoke login admin DB (pas compte littéral).
2. Vérifier `DEMO_MODE=false` en production.
3. Confirmer `/api/setup-db` → 404 en production.
4. Invalider les sessions utilisateurs si `NEXTAUTH_SECRET` a changé.
