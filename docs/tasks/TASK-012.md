# [TASK-012] Sayings — Tests backend

**Feature :** Mémoire vivante — Backend
**Rôle cible :** Dev Backend
**Priorité :** P0 (bloquant)
**Dépendances :** TASK-011
**Statut :** Terminé

## Objectif

Écrire les tests unitaires et d'intégration couvrant les 5 endpoints CRUD du module Sayings, incluant les cas nominaux, les erreurs de validation, l'authentification et le verrouillage.

## Inputs

- `backend/app/api/sayings.py` (TASK-011) — 5 endpoints
- `backend/app/schemas/saying.py` (TASK-011) — schémas Pydantic
- `backend/tests/test_auth.py` (TASK-004) — pattern de test existant à réutiliser (AsyncClient + ASGITransport)
- `backend/tests/test_deps.py` (TASK-005) — pattern de fixtures avec user en BDD

## Travail attendu

- Créer `backend/tests/test_sayings.py` avec les tests suivants :

### Fixtures communes

- `db_session` : session async connectée à une BDD de test (SQLite async ou PostgreSQL de test). **Important :** appeler `engine.dispose()` en teardown pour éviter l'erreur asyncpg "Future attached to a different loop".
- `auth_token` : token JWT valide (créer un user en BDD, générer un token via `create_access_token`)
- `sample_saying` : un saying inséré en BDD pour les tests GET/PUT/DELETE

### Tests GET /sayings/today

- `test_today_no_sayings` : base vide → 404
- `test_today_returns_one` : 3 sayings en base → retourne un saying valide avec tous les champs
- `test_today_deterministic` : 2 appels le même jour → même résultat

### Tests GET /sayings

- `test_list_empty` : base vide → 200, items=[], total=0
- `test_list_with_data` : 3 sayings → 200, items contient 3 éléments
- `test_list_filter_type` : 2 dictons + 1 proverbe, filtre `?type=Dicton` → 2 résultats
- `test_list_filter_localite` : filtre `?localite=Marseille` → résultats filtrés
- `test_list_pagination` : 5 sayings, `?per_page=2&page=2` → 2 items, page=2, pages=3

### Tests POST /sayings

- `test_create_without_auth` : POST sans token → 401
- `test_create_missing_required_fields` : champs obligatoires manquants → 422
- `test_create_success` : POST valide → 201, retourne le saying avec id et created_at
- `test_create_with_optional_fields` : POST avec type et contexte → 201, champs optionnels présents
- `test_create_logs_action` : POST → vérifier qu'une entrée INSERT existe dans edit_log

### Tests PUT /sayings/{id}

- `test_update_without_auth` : PUT sans token → 401
- `test_update_not_found` : PUT sur id inexistant → 404
- `test_update_success` : PUT valide → 200, champ modifié
- `test_update_partial` : PUT avec un seul champ → 200, seul ce champ est modifié
- `test_update_locked_by_other` : saying verrouillé par un autre user → 403
- `test_update_logs_action` : PUT → vérifier qu'une entrée UPDATE existe dans edit_log avec old_data

### Tests DELETE /sayings/{id}

- `test_delete_without_auth` : DELETE sans token → 401
- `test_delete_not_found` : DELETE sur id inexistant → 404
- `test_delete_success` : DELETE → 200, saying supprimé de la base
- `test_delete_locked_by_other` : saying verrouillé par un autre → 403
- `test_delete_logs_action` : DELETE → vérifier qu'une entrée DELETE existe dans edit_log

## Outputs

- `backend/tests/test_sayings.py` — ~20 tests

## Tests automatisés à écrire

C'est cette tâche elle-même.

## Tests manuels (vérification)

- `cd backend && source .venv/bin/activate && export $(grep -v '^#' ../.env | xargs) && python -m pytest tests/test_sayings.py -v`
- Tous les tests passent

## Critères de "Done"

- [x] `test_sayings.py` contient au moins 20 tests
- [x] Couverture : cas nominaux + erreurs auth + erreurs validation + verrouillage + edit_log
- [x] Tous les tests passent
- [x] Aucune régression sur les tests existants (`python -m pytest tests/ -v`)
