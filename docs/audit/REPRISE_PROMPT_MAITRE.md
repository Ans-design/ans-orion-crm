# Prompt maître fusionné — reprise d’état (2026-07-18)

## 1. Dossier canonique

| Retenu | Exclus |
|--------|--------|
| `C:\Users\ans\Documents\ANS OKOK TATY AORIAN\PROJET AVANT FINAL` | `$ExportFolder`, caches, copies imbriquées, `deploy/` comme source code |

Sentinelles : `package.json`, `app/`, `lib/`, `components/`, `prisma/` — **VÉRIFIÉ**.

## 2. Git / empreinte

**Pas de `.git`** — pas d’init/commit/push (D-001). Empreinte = copie de travail locale.

## 3. Stack vérifiée

| Composant | Version |
|-----------|---------|
| Next.js | 14.2.28 |
| React | 18.2.0 |
| Prisma client | ^6.19.3 |
| Auth | NextAuth 4.x (existant) |

## 4. Baseline (session)

| Contrôle | Statut |
|----------|--------|
| Typecheck | À relancer après lot B-01…B-05 |
| Lint global | **NON EXÉCUTÉ** |
| Tests ciblés unwrap | À lancer |
| Build local / hostinger | **NON EXÉCUTÉ** |
| E2E | **NON EXÉCUTÉ** |

## 5. Stratégie DB

| Élément | Constat |
|---------|---------|
| `prisma/schema.prisma` | `provider = "sqlite"` |
| `migration_lock.toml` | `provider = "postgresql"` |
| Cible long terme | PostgreSQL (D-002) |
| Écriture migrate/seed | **BLOQUÉ** sans backup (D-004) |

## 6. Sauvegardes

Aucune dump PG / `.db` métier restaurable confirmée — **MANQUANT** → max **GO STAGING**.

## 7. PDF V17

| Fichier | Statut |
|---------|--------|
| `docs/references/Audit_Complet_Referentiel_ANS_V17.pdf` | **Présent** |
| `ANS_Design_Print_Referentiel_AZ_V17_Complet_Enrichi.pdf` | **MANQUANT** (Downloads / workspace) |

C01–C06 : **ne pas coder aveuglément**.

## 8. Lots sûrs appliqués

- **B-01…B-10** — unwrap API, messages d’erreur, anti double-submit/create, claim réception, hub commande
- **D-011** — release Annulée + consommation stock Prête / Livré
- **V2-06b** — invariants finance overpay / facture
- **V2-05b** — réception achat atomique
- **RC Auth auto** — scan 387 routes + preuves RBAC

## 9. P0 / P1 encore ouverts

Voir `AUDIT_BUGS_ANOMALIES_ETAPES.md` : backup PG, payment drift D-012, checklist staging restante, build Hostinger et PDF V17.

## 10. Opérations bloquées

migrate / db push / seed / repair écriture / deploy prod / mutation rôles / inventer formules.

## Prochain lot sûr candidat

Préparation locale des recettes staging / contrôles API restants ; aucune écriture payment drift sans backup + autorisation D-012.
