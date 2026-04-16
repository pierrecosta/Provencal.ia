# [TASK-011] Sayings — Schémas Pydantic + 5 endpoints CRUD

**Feature :** Mémoire vivante — Backend
**Rôle cible :** Dev Backend
**Priorité :** P0 (bloquant)
**Dépendances :** TASK-010
**Statut :** Terminé

## Objectif

Implémenter les 5 endpoints CRUD du module Mémoire vivante (dictons, expressions, proverbes). C'est le premier module fonctionnel complet du projet — il sert de référence pour tous les modules CRUD suivants.

## Inputs

- `backend/app/models/saying.py` (TASK-002) — modèle `Saying` (terme_provencal, localite_origine, traduction_sens_fr, type, contexte, source, locked_by, locked_at, created_by, created_at)
- `backend/app/services/locking.py` (TASK-010) — `acquire_lock`, `release_lock`
- `backend/app/services/edit_log.py` (TASK-010) — `log_action`
- `backend/app/schemas/pagination.py` (TASK-010) — `PaginationParams`, `PaginatedResponse`, `paginate`
- `backend/app/api/deps.py` (TASK-005) — `get_current_user`
- Cahier technique §6.3 — endpoints Sayings :
  - `GET /sayings/today` — terme du jour (sélection déterministe `CURRENT_DATE % COUNT(*)`)
  - `GET /sayings` — liste paginée, filtres `?type=&localite=&page=1&per_page=20`
  - `POST /sayings` — créer (auth requise)
  - `PUT /sayings/{id}` — modifier (auth requise, vérifie verrou)
  - `DELETE /sayings/{id}` — supprimer (auth requise)
- Cahier fonctionnel §3.1 — champs, types (Dicton/Expression/Proverbe), terme du jour

## Travail attendu

- Créer `backend/app/schemas/saying.py` :
  - `SayingCreate(BaseModel)` : terme_provencal (str, max 500), localite_origine (str, max 200), traduction_sens_fr (str), type (Optional, Literal["Dicton","Expression","Proverbe"]), contexte (Optional[str]), source (Optional[str], max 300)
  - `SayingUpdate(BaseModel)` : mêmes champs, tous optionnels (partial update)
  - `SayingResponse(BaseModel)` : id + tous les champs + created_at + locked_by (Optional[int]) + is_locked (bool, calculé)
  - `model_config = ConfigDict(from_attributes=True)`

- Créer `backend/app/api/sayings.py` avec un routeur FastAPI (`prefix="/sayings"`, `tags=["Mémoire vivante"]`) :

  1. **`GET /sayings/today`** (public) :
     - Formule de sélection : `id` du saying à la position `(date.today().toordinal() % total_count)` — déterministe, change chaque jour, cycle sur toutes les entrées
     - Si aucune entrée en base → 404 avec message clair
     - Retourne un `SayingResponse`

  2. **`GET /sayings`** (public) :
     - Filtres query params : `type` (optionnel), `localite` (optionnel, recherche partielle `ILIKE`)
     - Pagination via `PaginationParams` (page, per_page)
     - Tri par `created_at DESC`
     - Retourne `PaginatedResponse[SayingResponse]`

  3. **`POST /sayings`** (auth requise) :
     - Body : `SayingCreate`
     - `created_by = current_user.id`
     - Log l'action INSERT dans `edit_log`
     - Retourne 201 + `SayingResponse`

  4. **`PUT /sayings/{id}`** (auth requise) :
     - Body : `SayingUpdate`
     - Vérifie que l'entrée existe (sinon 404)
     - Acquiert le verrou via `acquire_lock` (sinon 403)
     - Log l'action UPDATE dans `edit_log` (old_data = état avant modification)
     - Libère le verrou après sauvegarde
     - Retourne 200 + `SayingResponse`

  5. **`DELETE /sayings/{id}`** (auth requise) :
     - Vérifie que l'entrée existe (sinon 404)
     - Vérifie le verrou (si verrouillé par un autre → 403)
     - Log l'action DELETE dans `edit_log` (old_data = état supprimé)
     - Supprime l'entrée
     - Retourne 200 + `{"message": "Supprimé"}`

- Enregistrer le routeur dans `backend/app/main.py` avec le préfixe `/api/v1`

## Outputs

- `backend/app/schemas/saying.py`
- `backend/app/api/sayings.py`
- `backend/app/main.py` modifié (ajout du routeur sayings)

## Tests automatisés à écrire

Voir TASK-012.

## Tests manuels (vérification)

- Swagger UI (`/docs`) : les 5 endpoints sont visibles sous le tag « Mémoire vivante »
- Tester le CRUD manuellement via Swagger après avoir seedé un user

## Critères de "Done"

- [x] 5 endpoints fonctionnels sous `/api/v1/sayings`
- [x] Schémas Pydantic validés (création, modification, réponse)
- [x] Terme du jour déterministe et change chaque jour
- [x] Pagination fonctionnelle avec filtres type/localité
- [x] Verrouillage et edit_log intégrés sur PUT et DELETE
- [x] Routeur enregistré dans `main.py`
- [x] Visible dans Swagger UI
