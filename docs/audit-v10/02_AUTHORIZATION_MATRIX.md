# Autorisation — matrice (V10)

Service canonique : `lib/auth/authorize.ts`  
Surfaces : API (`requirePermission`), navigation, payloads DTO.

Priorité : refus utilisateur > refus rôle > politique de base.  
Erreur lecture overrides ⇒ **refus** (fail-closed).

Détail rôles × actions : complété au fil des tests `tests/authorize-*.test.ts`.
