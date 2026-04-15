# [TASK-044] Migration blacklist JWT — Table PostgreSQL persistante

**Feature :** Sécurité / Authentification
**Rôle cible :** Dev Backend
**Priorité :** P0 (bloquant avant prod)
**Dépendances :** TASK-039
**Statut :** À faire

## Objectif

Remplacer la blacklist JWT en mémoire (`set()` Python) par une table PostgreSQL persistante. La blacklist actuelle est vidée à chaque redémarrage du serveur, ce qui permet à des tokens révoqués (logout) d'être réutilisés. En déploiement multi-instance (K8s), la blacklist n'est pas partagée entre les pods — un token révoqué sur un pod reste valide sur les autres.

## Contexte du problème

Fichier actuel `backend/app/api/blacklist.py` (3 lignes) :
```python
# Blacklist en mémoire des tokens JWT révoqués (logout).
# Vidée au redémarrage — acceptable : tokens expirent en 60 min, max 10 contributeurs.
token_blacklist: set[str] = set()
```

**Risques :**
- Redémarrage serveur (deploy, crash, scaling) → tous les tokens révoqués redeviennent valides
- Multi-instance K8s → blacklist non partagée entre pods
- Pas de nettoyage automatique des tokens expirés → accumulation mémoire (risque faible avec 10 users, mais anti-pattern)

## Travail attendu

### 1. Créer le modèle SQLAlchemy

- `backend/app/models/token_blacklist.py` :
  ```python
  class TokenBlacklist(Base):
      __tablename__ = "token_blacklist"

      id: Mapped[int] = mapped_column(primary_key=True)
      token: Mapped[str] = mapped_column(String(500), unique=True, nullable=False, index=True)
      revoked_at: Mapped[datetime] = mapped_column(default=func.now())
      expires_at: Mapped[datetime] = mapped_column(nullable=False)
  ```
  - `token` : le JWT complet (indexé pour recherche rapide)
  - `revoked_at` : date de révocation
  - `expires_at` : date d'expiration naturelle du token (pour nettoyage)

### 2. Créer la migration Alembic

- Nouvelle migration : `alembic revision --autogenerate -m "add_token_blacklist_table"`
- Table `token_blacklist` avec index unique sur `token`

### 3. Créer le service blacklist

- `backend/app/services/blacklist.py` :
  ```python
  async def revoke_token(db: AsyncSession, token: str, expires_at: datetime) -> None
      """Ajoute un token à la blacklist."""

  async def is_token_revoked(db: AsyncSession, token: str) -> bool
      """Vérifie si un token est dans la blacklist."""

  async def cleanup_expired_tokens(db: AsyncSession) -> int
      """Supprime les tokens expirés. Retourne le nombre supprimé."""
  ```

### 4. Modifier le endpoint logout

- `backend/app/api/auth.py` — route `POST /auth/logout` :
  - Décoder le token pour extraire `exp` (expiration)
  - Appeler `revoke_token(db, token, expires_at)` au lieu de `token_blacklist.add(token)`

### 5. Modifier la dependency `get_current_user`

- `backend/app/api/deps.py` :
  - Remplacer `if token in token_blacklist` par `if await is_token_revoked(db, token)`
  - Importer le service au lieu du set en mémoire

### 6. Supprimer l'ancien fichier

- Supprimer `backend/app/api/blacklist.py` (le `set()` en mémoire)
- Mettre à jour les imports dans `auth.py` et `deps.py`

### 7. Nettoyage automatique (optionnel mais recommandé)

- Ajouter un endpoint interne ou une tâche de maintenance :
  ```python
  @router.post("/auth/cleanup-tokens", include_in_schema=False)
  async def cleanup_tokens(db: AsyncSession = Depends(get_db)):
      count = await cleanup_expired_tokens(db)
      return {"deleted": count}
  ```
- Alternative : appeler `cleanup_expired_tokens` à chaque logout (nettoyage opportuniste)

### 8. Mettre à jour `models/__init__.py`

- Ajouter `TokenBlacklist` aux imports centralisés

## Outputs

- `backend/app/models/token_blacklist.py` (nouveau)
- `backend/app/services/blacklist.py` (nouveau)
- `backend/alembic/versions/xxxx_add_token_blacklist_table.py` (nouvelle migration)
- `backend/app/models/__init__.py` (modifié)
- `backend/app/api/auth.py` (modifié)
- `backend/app/api/deps.py` (modifié)
- `backend/app/api/blacklist.py` (supprimé)

## Tests automatisés à écrire

- `backend/tests/test_blacklist.py` :
  - `test_revoke_token_inserts_row` — révoquer un token → entrée créée en BDD
  - `test_is_token_revoked_true` — token révoqué → `True`
  - `test_is_token_revoked_false` — token non révoqué → `False`
  - `test_revoke_duplicate_ignored` — révoquer le même token 2 fois → pas d'erreur (UNIQUE constraint gérée)
  - `test_cleanup_expired_tokens` — tokens expirés → supprimés, tokens valides → conservés
  - `test_logout_persists_across_restart` — révoquer un token, vérifier en BDD que l'entrée existe (simule persistance)

- Modifier `backend/tests/test_auth.py` :
  - `test_logout_revokes_token` — POST logout → token rejeté ensuite (test existant, vérifier qu'il passe toujours)
  - `test_revoked_token_rejected` — requête avec token révoqué → 401

- Modifier `backend/tests/test_deps.py` :
  - Adapter les tests de `get_current_user` qui vérifiaient `token_blacklist` (set) → vérifier via la BDD

## Tests manuels (vérification)

- `cd backend && pytest -v` → tous les tests passent (anciens + nouveaux)
- `docker-compose up --build` → migration appliquée automatiquement
- Via Swagger :
  1. `POST /auth/login` → token
  2. `GET /sayings` avec le token → 200
  3. `POST /auth/logout` → token révoqué
  4. `GET /sayings` avec le même token → 401
  5. Redémarrer le conteneur backend : `docker-compose restart backend`
  6. `GET /sayings` avec le même token → 401 (persistance vérifiée)

## Critères de "Done"

- [ ] Table `token_blacklist` créée via migration Alembic
- [ ] Service `blacklist.py` avec `revoke_token`, `is_token_revoked`, `cleanup_expired_tokens`
- [ ] Endpoint logout utilise la table PostgreSQL
- [ ] `get_current_user` vérifie la blacklist en BDD
- [ ] Ancien `blacklist.py` (set mémoire) supprimé — aucun `set()` en mémoire pour la blacklist dans le codebase
- [ ] Token révoqué reste rejeté après redémarrage du serveur (`docker-compose restart backend`)
- [ ] Tests passent (anciens + nouveaux)
- [ ] Aucune régression sur les 116 tests existants
- [ ] Migration appliquée automatiquement par `entrypoint.sh`
- [ ] `docker-compose down -v && docker-compose up --build` → migration propre sur base vierge
