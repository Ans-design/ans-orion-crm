# ANS Orion ERP / CRM

CRM professionnel pour imprimerie (Madagascar) — Next.js 14, Prisma, NextAuth.

## Installation locale

```bash
cp .env.example .env
npm install --legacy-peer-deps
npx prisma db push
npm run seed
npm run seed:demo
npm run dev
```

→ [http://localhost:3000/login](http://localhost:3000/login)

## Variables d'environnement

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLite local ou PostgreSQL production |
| `NEXTAUTH_SECRET` | Secret JWT (32+ caractères) |
| `NEXTAUTH_URL` | URL publique de l'app |
| `DEMO_MODE` | Mode démo sans base (Vercel) |
| `ALLOW_PUBLIC_SIGNUP` | `true` = inscription ouverte (dev) |

## Rôles utilisateurs

| Rôle | Accès |
|---|---|
| **admin** | Tout + import/export/audit/utilisateurs |
| **manager** | Direction, export, audit, utilisateurs |
| **commercial** | Clients, devis, commandes, POS |
| **caisse** | Factures, paiements, POS |
| **production** | Commandes, production |
| **livraison** | Livraisons |
| **lecture** | Consultation seule (écriture bloquée) |

## Scripts

```bash
npm run dev          # Développement
npm run build        # Build production
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run test         # Tests unitaires
npm run seed         # Données de démo complètes
npm run seed:regles  # Sync règles catalogue
```

## Déploiement Vercel

1. Base **PostgreSQL** (Neon) — SQLite incompatible serverless
2. Variables : `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
3. `npm run build` doit passer avant deploy

## Modules CRM

Dashboard · Clients · Devis · Commandes · Production · Factures · Paiements · Livraisons · POS/Panier · Tarifs · Règles & Formules · Paramètres · Import/Export · Audit

## Sécurité

- Routes API protégées par middleware JWT
- Rôles et permissions granulaires (`lib/auth/permissions.ts`)
- `/api/signup` réservé admin en production
- Export/import/audit protégés par permission
- Validation Zod sur inscriptions
- Erreurs serveur masquées en production
