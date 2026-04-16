# [TASK-004] Endpoint POST /auth/login

**Feature :** Fondations & Initialisation
**Rôle cible :** Dev Backend
**Priorité :** P0 (bloquant)
**Dépendances :** TASK-001, TASK-002
**Statut :** Terminé

## Objectif

Implémenter l'endpoint d'authentification `POST /api/v1/auth/login` qui vérifie les identifiants (pseudo + mot de passe) et retourne un JWT Bearer token. C'est le point d'entrée de l'authentification contributeur.

## Inputs

- `backend/app/core/security.py` — fonctions `verify_password()`, `create_access_token()` déjà implémentées
- `backend/app/core/config.py` — `settings.ACCESS_TOKEN_EXPIRE_MINUTES` (60 min)
- `backend/app/models/user.py` (TASK-002) — modèle `User` (pseudo, password_hash)
- `backend/app/core/database.py` (TASK-001) — `get_db()` dépendance

## Travail attendu

- Créer `backend/app/api/` (package Python avec `__init__.py`)
- Créer `backend/app/api/auth.py` avec un routeur FastAPI :
  - Route `POST /auth/login`
  - Body attendu : `{ "pseudo": "...", "password": "..." }` (schéma Pydantic `LoginRequest`)
  - Logique : chercher le user par pseudo en BDD → vérifier le mot de passe via `verify_password()` → si OK, générer un token via `create_access_token({"sub": user.pseudo})` → retourner `{ "access_token": "...", "token_type": "bearer" }`
  - Erreur : `401 Unauthorized` avec message générique `"Identifiant ou mot de passe incorrect"` (ne pas distinguer pseudo inconnu / mot de passe faux — règle de sécurité, cahier fonctionnel §6.7)
- Créer `backend/app/schemas/` (package Python avec `__init__.py`)
- Créer `backend/app/schemas/auth.py` :
  - `LoginRequest(BaseModel)` : pseudo (str), password (str)
  - `TokenResponse(BaseModel)` : access_token (str), token_type (str)
- Enregistrer le routeur dans `backend/app/main.py` avec le préfixe `/api/v1`

## Outputs

- `backend/app/api/__init__.py`
- `backend/app/api/auth.py`
- `backend/app/schemas/__init__.py`
- `backend/app/schemas/auth.py`
- `backend/app/main.py` modifié (inclusion du routeur)

## Tests automatisés à écrire

- `backend/tests/test_auth.py` :
  - `test_login_missing_fields` : POST sans body → 422
  - `test_login_wrong_pseudo` : pseudo inexistant → 401 avec message générique
  - `test_login_wrong_password` : bon pseudo, mauvais mdp → 401 avec message générique
  - `test_login_success` : créer un user en BDD (fixture), POST avec bons identifiants → 200 + réponse contient `access_token` et `token_type == "bearer"`

## Tests manuels (vérification)

- Lancer la stack, insérer un user en base (`INSERT INTO users ...` avec mot de passe hashé bcrypt)
- `curl -X POST http://localhost:8000/api/v1/auth/login -H "Content-Type: application/json" -d '{"pseudo":"test","password":"test123"}'`
- Vérifier : réponse 200 avec un JWT valide
- Tester avec mauvais identifiants : réponse 401

## Critères de "Done"

- [x] `POST /api/v1/auth/login` fonctionne et retourne un JWT
- [x] Message d'erreur générique identique pour pseudo inconnu et mauvais mot de passe
- [x] Schémas Pydantic `LoginRequest` et `TokenResponse` validés
- [x] Routeur enregistré dans `main.py` sous `/api/v1`
- [x] Visible dans Swagger UI (`/docs`) en environnement dev
- [x] `test_auth.py` passe (4 tests minimum)
- [x] Aucune régression sur `test_health.py`
