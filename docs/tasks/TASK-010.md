# [TASK-010] Utilitaires transversaux — verrouillage, edit_log, pagination

**Feature :** Socle transversal
**Rôle cible :** Dev Backend
**Priorité :** P0 (bloquant)
**Dépendances :** TASK-005
**Statut :** À faire

## Objectif

Créer les services partagés qui seront utilisés par **tous** les modules CRUD éditoriaux : gestion du verrouillage d'édition (lock/unlock/check), journalisation des modifications (edit_log) et réponse paginée standard. Ces utilitaires sont factorisés pour éviter la duplication dans chaque module.

## Inputs

- `backend/app/models/edit_log.py` (TASK-002) — modèle `EditLog` (table_name, row_id, action, old_data, new_data, done_by, done_at)
- `backend/app/models/user.py` (TASK-002) — modèle `User`
- `backend/app/api/deps.py` (TASK-005) — `get_current_user`
- Cahier fonctionnel §7.3 — verrouillage : verrou expire après 30 min, levé à la sauvegarde ou annulation, `ON DELETE SET NULL`
- Cahier fonctionnel §7.4 — rollback : dernière action uniquement, via `edit_log`
- Cahier technique §6.1 — pagination : `?page=1&per_page=20` (défaut 20), tri `created_at DESC` sauf articles

## Travail attendu

- Créer `backend/app/services/` (package Python avec `__init__.py`)
- Créer `backend/app/services/locking.py` :
  - `async def acquire_lock(db, model_class, row_id, user_id)` — pose le verrou (`locked_by=user_id`, `locked_at=now()`). Retourne `True` si succès, lève `HTTPException(403)` si verrouillé par un autre contributeur (verrou non expiré)
  - `async def release_lock(db, model_class, row_id)` — libère le verrou (`locked_by=None`, `locked_at=None`)
  - `def is_locked(row, current_user_id) -> bool` — vérifie si le verrou est actif ET détenu par un autre utilisateur (`locked_at + 30min > now()` ET `locked_by != current_user_id`)
  - Constante `LOCK_TIMEOUT_MINUTES = 30`

- Créer `backend/app/services/edit_log.py` :
  - `async def log_action(db, table_name, row_id, action, old_data, new_data, user_id)` — insère une entrée dans `edit_log`
  - `async def get_last_log(db, table_name, row_id)` — retourne la dernière entrée du journal pour un élément donné (pour le rollback)
  - `old_data` et `new_data` sont des `dict` sérialisés en JSONB

- Créer `backend/app/schemas/pagination.py` :
  - `PaginationParams(BaseModel)` : `page: int = 1`, `per_page: int = 20` (avec validation `ge=1` pour page, `le=100` pour per_page)
  - `PaginatedResponse(BaseModel, Generic[T])` : `items: list[T]`, `total: int`, `page: int`, `per_page: int`, `pages: int` (nombre total de pages)
  - Helper `async def paginate(db, query, page, per_page)` → retourne un `PaginatedResponse`

## Outputs

- `backend/app/services/__init__.py`
- `backend/app/services/locking.py`
- `backend/app/services/edit_log.py`
- `backend/app/schemas/pagination.py`

## Tests automatisés à écrire

- `backend/tests/test_locking.py` :
  - `test_acquire_lock_success` — verrouiller une ligne libre → succès
  - `test_acquire_lock_already_locked` — verrouiller une ligne verrouillée par un autre → 403
  - `test_acquire_lock_expired` — verrouiller une ligne dont le verrou a expiré (>30 min) → succès
  - `test_release_lock` — libérer un verrou → `locked_by` et `locked_at` à None
  - `test_is_locked_by_other` — vérifie le calcul d'expiration

- `backend/tests/test_edit_log.py` :
  - `test_log_action_insert` — log une action INSERT → entrée créée dans edit_log
  - `test_get_last_log` — récupérer le dernier log d'un élément → bonne entrée retournée

**Note développeur :** Utiliser le pattern `engine.dispose()` dans les fixtures de test async pour éviter l'erreur "Future attached to a different loop" (cf. TASK-004).

## Tests manuels (vérification)

- Importer les services dans un shell Python et vérifier les signatures

## Critères de "Done"

- [ ] `locking.py` avec `acquire_lock`, `release_lock`, `is_locked` fonctionnels
- [ ] `edit_log.py` avec `log_action`, `get_last_log` fonctionnels
- [ ] `pagination.py` avec `PaginationParams`, `PaginatedResponse`, `paginate` fonctionnels
- [ ] Tests passent
- [ ] Aucune régression sur les tests existants
