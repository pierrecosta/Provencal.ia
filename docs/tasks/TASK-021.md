# [TASK-021] Agenda — API CRUD (4 endpoints)

**Feature :** Agenda culturel — Backend
**Rôle cible :** Dev Backend
**Priorité :** P1 (important)
**Dépendances :** TASK-010
**Statut :** Terminé

## Objectif

Implémenter les 4 endpoints CRUD du module Agenda culturel : liste des événements (à venir + archives), création, modification et suppression, avec verrouillage et journalisation.

## Inputs

- `backend/app/models/agenda_event.py` (TASK-002) — modèle `AgendaEvent` (titre, date_debut, date_fin, lieu, description, lien_externe, locked_by, locked_at, created_by, created_at)
- `backend/app/services/locking.py` (TASK-010) — `acquire_lock`, `release_lock`
- `backend/app/services/edit_log.py` (TASK-010) — `log_action`
- `backend/app/schemas/pagination.py` (TASK-010) — `PaginationParams`, `PaginatedResponse`, `paginate`
- `backend/app/api/deps.py` (TASK-005) — `get_current_user`
- Cahier technique §6.3 — endpoints Agenda :
  - `GET /events` — événements à venir (chronologique), `?archive=true` pour les archives, `?lieu=&annee=&mois=`
  - `POST /events` — créer (auth)
  - `PUT /events/{id}` — modifier (auth, vérifie verrou)
  - `DELETE /events/{id}` — supprimer (auth)
- Cahier fonctionnel §3.4 — archivage automatique si date_fin passée, vue principale = 3 prochains événements mis en avant

## Travail attendu

- Créer `backend/app/schemas/event.py` :
  - `EventCreate(BaseModel)` : titre (str, max 200, obligatoire), date_debut (date, obligatoire), date_fin (date, obligatoire), lieu (Optional[str], max 200), description (Optional[str], max 1000), lien_externe (Optional[str], max 500). Validation : `date_fin >= date_debut`.
  - `EventUpdate(BaseModel)` : mêmes champs, tous optionnels (partial update). Validation : si les deux dates présentes, `date_fin >= date_debut`.
  - `EventResponse(BaseModel)` : id + tous les champs + created_at + locked_by (Optional[int]) + is_locked (bool, calculé). `model_config = ConfigDict(from_attributes=True)`

- Créer `backend/app/api/events.py` avec un routeur FastAPI (`prefix="/events"`, `tags=["Agenda"]`) :

  1. **`GET /events`** (public) :
     - Par défaut : événements **à venir** (`date_fin >= today()`), triés par `date_debut ASC`
     - Si `?archive=true` : événements **passés** (`date_fin < today()`), triés par `date_debut DESC`
     - Filtres query params : `lieu` (ILIKE, optionnel), `annee` (int, optionnel), `mois` (int, optionnel)
     - Pagination via `PaginationParams`
     - Retourne `PaginatedResponse[EventResponse]`

  2. **`POST /events`** (auth requise) :
     - Body : `EventCreate`
     - Créer l'événement, `created_by = current_user.id`
     - Log action INSERT dans `edit_log`
     - Retourne `EventResponse`, status 201

  3. **`PUT /events/{id}`** (auth requise) :
     - Vérifier existence (404 si absent)
     - Acquérir le verrou (`acquire_lock`)
     - Mettre à jour les champs fournis
     - Log action UPDATE dans `edit_log` (old_data / new_data)
     - Libérer le verrou
     - Retourne `EventResponse`

  4. **`DELETE /events/{id}`** (auth requise) :
     - Vérifier existence (404 si absent)
     - Log action DELETE dans `edit_log` (old_data = données avant suppression)
     - Supprimer l'événement
     - Retourne `{ "message": "Événement supprimé" }`, status 200

- Enregistrer le routeur dans `backend/app/main.py` avec le préfixe `/api/v1`

## Outputs

- `backend/app/schemas/event.py`
- `backend/app/api/events.py`
- `backend/app/main.py` modifié (inclusion du routeur)

## Tests automatisés à écrire

- `backend/tests/test_events.py` :
  - `test_list_empty` : base vide → 200, items=[], total=0
  - `test_list_upcoming_only` : 2 à venir + 1 passé → 2 résultats (par défaut)
  - `test_list_archive` : `?archive=true` → seuls les passés
  - `test_list_filter_lieu` : filtre `?lieu=Marseille` → résultats filtrés
  - `test_list_filter_annee_mois` : filtre `?annee=2026&mois=6` → résultats filtrés
  - `test_create_without_auth` : POST sans token → 401
  - `test_create_invalid_dates` : date_fin < date_debut → 422
  - `test_create_success` : POST valide → 201
  - `test_update_success` : PUT valide → 200 + données modifiées
  - `test_update_not_found` : PUT sur id inexistant → 404
  - `test_delete_success` : DELETE → 200 + événement disparu
  - `test_create_logs_action` : POST → entrée INSERT dans edit_log

## Tests manuels (vérification)

- `GET /api/v1/events` → liste des événements à venir en ordre chronologique
- `GET /api/v1/events?archive=true` → archives
- Créer / modifier / supprimer via curl ou Swagger UI
- Vérifier que `edit_log` contient les entrées correspondantes

## Critères de "Done"

- [x] Les 4 endpoints fonctionnent (GET, POST, PUT, DELETE)
- [x] Le filtre `?archive=true` retourne uniquement les événements passés
- [x] Les filtres par lieu, année, mois fonctionnent
- [x] La validation `date_fin >= date_debut` est appliquée
- [x] Le verrouillage est vérifié sur PUT
- [x] Les actions sont journalisées dans `edit_log`
- [x] Le routeur est enregistré dans `main.py`
- [x] Les tests passent
