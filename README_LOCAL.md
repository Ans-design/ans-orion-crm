
## Tarifs locaux

- `STRICT_POS_PRICING=1` (ou `APP_ENV=staging` / production) : pas de fallback `prixDepart` catalogue.ts ; source = Backoffice / DB.
- Legacy Excel PRIX 2026 : `USE_PRIX_2026_LEGACY=true` **uniquement** en local/dev — refusé en staging/prod.

Après `npm run ensure:v29` puis `npm run seed:v29` — mots de passe **uniquement** via variables d’environnement (jamais commités) :
| `SEED_DEMO_EMAIL` (défaut local `demo@ansdesign.mg`) | `SEED_DEMO_PASSWORD` / `DEMO_PASSWORD` |
| Admin (`SEED_ADMIN_EMAIL` / `DEMO_ADMIN_EMAIL`) | `SEED_ADMIN_PASSWORD` / `DEMO_ADMIN_PASSWORD` |
| Profils équipe (17) — email ou matricule | `ORION_V29_PASSWORDS_JSON` |
Sur localhost : **Accès de démonstration** liste chaque profil — connexion 1 clic ou email + mot de passe.

```bash
npm run ensure:v29   # complète les mots de passe .env.local
npm run seed:v29     # upsert employés + users
```

Connexion rapide (cartes démo + profils) activée en local.
