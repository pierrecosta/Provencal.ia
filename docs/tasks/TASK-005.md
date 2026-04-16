# [TASK-005] Dépendance FastAPI get_current_user

**Feature :** Fondations & Initialisation
**Rôle cible :** Dev Backend
**Priorité :** P0 (bloquant)
**Dépendances :** TASK-004
**Statut :** Terminé

## Objectif

Créer la dépendance FastAPI `get_current_user` qui extrait et valide le JWT Bearer token depuis le header `Authorization`, puis retourne l'utilisateur connecté. Cette dépendance sera utilisée par tous les endpoints protégés (CRUD contributeur).

## Inputs

- `backend/app/core/security.py` — fonction `decode_access_token(token)` → dict ou None
- `backend/app/models/user.py` (TASK-002) — modèle `User`
- `backend/app/core/database.py` (TASK-001) — `get_db()`
- Cahier technique §4.1 — JWT Bearer token, HS256, 60 min

## Travail attendu

- Créer `backend/app/api/deps.py` avec :
  - `oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")` — pour l'intégration Swagger UI (bouton Authorize)
  - `async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User` :
    - Décoder le token via `decode_access_token(token)`
    - Si décodage échoue ou token expiré → `HTTPException(401, "Token invalide ou expiré")`
    - Extraire `sub` (pseudo) du payload
    - Chercher le user en BDD par pseudo
    - Si user introuvable → `HTTPException(401, "Utilisateur introuvable")`
    - Retourner l'objet `User`

## Outputs

- `backend/app/api/deps.py`

## Tests automatisés à écrire

- `backend/tests/test_deps.py` :
  - `test_no_token` : appel sans header Authorization → 401
  - `test_invalid_token` : token malformé → 401
  - `test_expired_token` : token avec expiration passée → 401
  - `test_valid_token_user_not_found` : token valide mais pseudo supprimé de la BDD → 401
  - `test_valid_token_success` : token valide, user en BDD → l'endpoint protégé retourne 200

Note : pour tester, créer un endpoint temporaire de test ou utiliser un endpoint protégé existant (TASK-006).

## Tests manuels (vérification)

- Obtenir un token via `POST /api/v1/auth/login`
- Appeler un endpoint protégé avec `Authorization: Bearer <token>` → 200
- Appeler sans header → 401
- Attendre l'expiration (ou forger un token expiré) → 401

## Critères de "Done"

- [x] `get_current_user` existe dans `backend/app/api/deps.py`
- [x] Retourne un objet `User` pour un token valide
- [x] Lève `HTTPException(401)` pour token absent, invalide, expiré ou user supprimé
- [x] Intégré avec Swagger UI (bouton Authorize fonctionnel via `OAuth2PasswordBearer`)
- [x] Tests passent
- [x] Aucune régression sur les tests existants
