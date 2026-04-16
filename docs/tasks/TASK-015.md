# [TASK-015] Frontend — Page de connexion + gestion auth

**Feature :** Frontend — Socle UI
**Rôle cible :** Dev Frontend
**Priorité :** P0 (bloquant)
**Dépendances :** TASK-014
**Statut :** Terminé

## Objectif

Implémenter la page de connexion et le système de gestion d'authentification côté frontend (stockage du token, appels API protégés, détection d'expiration). Cette brique est nécessaire pour tout le mode contributeur.

## Inputs

- `backend/app/api/auth.py` (TASK-004/006) — `POST /api/v1/auth/login` (retourne `{ access_token, token_type }`) et `POST /api/v1/auth/logout`
- `frontend/src/components/layout/` (TASK-014) — navigation et routing en place
- Cahier fonctionnel §6.7 — page de connexion : centrée, carte 400px max, message "Identifiants fournis par l'administrateur", labels visibles, pas de lien mot de passe oublié, erreur générique
- Cahier fonctionnel §8.3 — session expirée : redirection silencieuse, avertissement 5 min avant
- Cahier technique §11.4 — styles : carte centrée, bouton pleine largeur #869121

## Travail attendu

- Créer `frontend/src/services/api.ts` :
  - Client HTTP (fetch natif ou wrapper léger) avec base URL `VITE_API_URL`
  - Intercepteur : injecter automatiquement le header `Authorization: Bearer <token>` si un token est stocké
  - Intercepteur de réponse : si 401 → effacer le token, rediriger vers `/connexion`

- Créer `frontend/src/hooks/useAuth.ts` (ou contexte React) :
  - `AuthContext` / `AuthProvider` wrappant l'application
  - État : `user` (pseudo ou null), `token` (string ou null), `isAuthenticated` (bool)
  - `login(pseudo, password)` → appelle `POST /api/v1/auth/login`, stocke le token en mémoire (pas en localStorage pour la sécurité), met à jour l'état
  - `logout()` → appelle `POST /api/v1/auth/logout`, efface le token et l'état
  - Le token est stocké en mémoire React (state) — perdu au rechargement de page, ce qui est acceptable pour ≤10 contributeurs

- Créer `frontend/src/pages/LoginPage.tsx` :
  - Layout : centré verticalement et horizontalement
  - Carte : `max-width: 400px`, fond blanc cassé, bordure grise
  - Contenu dans l'ordre :
    1. Titre « Connexion » centré
    2. Message informatif : *« Identifiants fournis par l'administrateur »* (couleur primaire, petite taille)
    3. Champ « Login » — label visible, placeholder vide, `autocomplete="username"`
    4. Champ « Mot de passe » — label visible, type password, sans icône œil, `autocomplete="current-password"`
    5. Bouton « Se connecter » — pleine largeur, fond #869121, texte blanc
  - Erreur : message générique *« Identifiant ou mot de passe incorrect »* en rouge sous le bouton
  - Après connexion réussie : redirection vers la page d'origine (ou `/` si accès direct)

- Modifier la navigation (TASK-014) :
  - Entrée « Compte » : si non connecté → lien vers `/connexion` avec icône cadenas ouvert. Si connecté → afficher le pseudo + icône cadenas fermé + option « Se déconnecter »

## Outputs

- `frontend/src/services/api.ts`
- `frontend/src/hooks/useAuth.ts` (ou `frontend/src/context/AuthContext.tsx`)
- `frontend/src/pages/LoginPage.tsx`
- Navigation modifiée (état connecté/déconnecté)

## Tests automatisés à écrire

- Pas de tests dans cette tâche (vérification manuelle)

## Tests manuels (vérification)

- Page `/connexion` : formulaire centré, tous les éléments visibles
- Login avec identifiants valides → redirection vers `/`, pseudo affiché dans la nav
- Login avec identifiants invalides → message d'erreur générique
- Bouton « Se déconnecter » → retour à l'état visiteur
- Accès à une page puis login → retour sur la page d'origine
- Rechargement de la page → perte de session (comportement attendu)
- Navigation clavier : Tab entre les champs, Enter pour soumettre

## Critères de "Done"

- [x] Page de connexion conforme au cahier (centré, carte 400px, labels, pas de lien mdp oublié)
- [x] Client API avec injection automatique du token
- [x] Contexte auth fonctionnel (login, logout, isAuthenticated)
- [x] Redirection sur 401
- [x] Navigation met à jour l'état connecté/déconnecté
- [x] Message d'erreur générique (pas de distinction pseudo/mdp)
- [x] `npm run build` sans erreur TypeScript
