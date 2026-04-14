# [TASK-006] Endpoint POST /auth/logout (blacklist JWT)

**Feature :** Fondations & Initialisation
**Rôle cible :** Dev Backend
**Priorité :** P0 (bloquant)
**Dépendances :** TASK-005
**Statut :** À faire

## Objectif

Implémenter l'endpoint `POST /api/v1/auth/logout` qui invalide le token JWT courant via une blacklist côté serveur. Après déconnexion, le token ne doit plus être accepté par `get_current_user`.

## Inputs

- `backend/app/api/deps.py` (TASK-005) — `get_current_user`, `oauth2_scheme`
- `backend/app/api/auth.py` (TASK-004) — routeur auth existant
- Cahier technique §4.1 — « Invalidation : Blacklist côté serveur (`POST /auth/logout`) »

## Travail attendu

- Implémenter une blacklist en mémoire (set Python) dans un module dédié ou directement dans `auth.py` :
  - `token_blacklist: set[str] = set()` — stockage en mémoire (suffisant pour ≤ 10 contributeurs, pas de persistence requise)
  - Note : la blacklist est vidée au redémarrage du serveur, ce qui est acceptable car les tokens expirent en 60 min
- Ajouter la route `POST /auth/logout` au routeur auth :
  - Nécessite authentification (`Depends(get_current_user)`)
  - Ajouter le token à la blacklist
  - Retourner `{ "message": "Déconnexion réussie" }`
- Modifier `get_current_user` dans `backend/app/api/deps.py` :
  - Avant de décoder le token, vérifier s'il est dans la blacklist
  - Si blacklisté → `HTTPException(401, "Token révoqué")`

## Outputs

- `backend/app/api/auth.py` modifié (ajout route logout + blacklist)
- `backend/app/api/deps.py` modifié (vérification blacklist)

## Tests automatisés à écrire

- `backend/tests/test_auth.py` (compléter le fichier existant) :
  - `test_logout_without_token` : POST sans auth → 401
  - `test_logout_success` : login → logout avec token → 200 + message
  - `test_token_after_logout` : login → logout → réutiliser le même token sur un endpoint protégé → 401

## Tests manuels (vérification)

- Login → récupérer le token
- `curl -X POST http://localhost:8000/api/v1/auth/logout -H "Authorization: Bearer <token>"` → 200
- Réutiliser le même token → 401

## Critères de "Done"

- [ ] `POST /api/v1/auth/logout` fonctionne et invalide le token
- [ ] Un token blacklisté est refusé par `get_current_user`
- [ ] La blacklist est en mémoire (pas de table BDD)
- [ ] Endpoint visible dans Swagger UI avec cadenas (auth requise)
- [ ] Tests passent
- [ ] Aucune régression sur les tests existants
