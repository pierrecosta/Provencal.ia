# [TASK-027] Bibliothèque — API CRUD (5 endpoints) + seed

**Feature :** Bibliothèque — Backend
**Rôle cible :** Dev Backend
**Priorité :** P1 (important)
**Dépendances :** TASK-010, TASK-026
**Statut :** À faire

## Objectif

Implémenter les 5 endpoints CRUD du module Bibliothèque (Histoires et Légendes) avec support image, contenu bilingue (lien traduction_id), filtres et script de seed pour les 5 entrées de test.

## Inputs

- `backend/app/models/library_entry.py` (TASK-002) — modèle `LibraryEntry` (titre, typologie, periode, description_courte, description_longue, source_url, image_ref, lang, traduction_id, locked_by, locked_at, created_by, created_at)
- `backend/app/services/locking.py` (TASK-010) — verrouillage
- `backend/app/services/edit_log.py` (TASK-010) — journalisation
- `backend/app/schemas/pagination.py` (TASK-010) — pagination
- `backend/app/api/deps.py` (TASK-005) — `get_current_user`
- `docs/sources/histoire_init.txt` — 5 entrées (3 Histoires, 2 Légendes) avec contenu Markdown
- Cahier technique §6.3 — endpoints Bibliothèque :
  - `GET /library` — liste, filtres `?type=Histoire|Légende&periode=&lieu=&page=1&per_page=20`
  - `GET /library/{id}` — détail d'une entrée
  - `POST /library` (auth)
  - `PUT /library/{id}` (auth, verrou)
  - `DELETE /library/{id}` (auth)
- Cahier fonctionnel §3.5 — périodes dynamiques, toggle FR/Provençal via `traduction_id`, Markdown pour description_longue

## Travail attendu

### Schémas Pydantic
- Créer `backend/app/schemas/library.py` :
  - `LibraryCreate(BaseModel)` : titre (str, max 200, obligatoire), typologie (Optional[Literal["Histoire","Légende"]]), periode (Optional[str], max 200), description_courte (Optional[str], max 200), description_longue (Optional[str]), source_url (Optional[str], max 500), image_ref (Optional[str], max 500), lang (str, default "fr", max 2), traduction_id (Optional[int])
  - `LibraryUpdate(BaseModel)` : mêmes champs, tous optionnels
  - `LibraryResponse(BaseModel)` : id + tous les champs + created_at + locked_by + is_locked + `has_translation` (bool, calculé à partir de traduction_id != None). `model_config = ConfigDict(from_attributes=True)`
  - `LibraryDetailResponse(LibraryResponse)` : ajoute `translation_lang` (Optional[str]) — la langue de la version liée

### Endpoints
- Créer `backend/app/api/library.py` avec un routeur FastAPI (`prefix="/library"`, `tags=["Bibliothèque"]`) :

  1. **`GET /library`** (public) :
     - Filtres : `type` (Histoire/Légende, optionnel), `periode` (ILIKE, optionnel), `lieu` (ILIKE sur description_courte, optionnel)
     - Pagination standard
     - Tri par `created_at DESC`
     - Retourne `PaginatedResponse[LibraryResponse]`

  2. **`GET /library/{id}`** (public) :
     - Retourne `LibraryDetailResponse` incluant l'info sur la version liée (traduction_id)
     - 404 si inexistant

  3. **`POST /library`** (auth) :
     - Body : `LibraryCreate`
     - `created_by = current_user.id`
     - Si `traduction_id` fourni : vérifier que l'entrée cible existe et mettre à jour la FK dans les deux sens (lien bidirectionnel)
     - Log INSERT
     - Retourne `LibraryResponse`, status 201

  4. **`PUT /library/{id}`** (auth) :
     - Acquérir verrou, mettre à jour, log UPDATE, libérer verrou

  5. **`DELETE /library/{id}`** (auth) :
     - Si lien traduction_id : libérer le lien dans l'entrée liée (`traduction_id = NULL`)
     - Log DELETE, supprimer

- Ajouter un endpoint utilitaire :
  - `GET /library/periodes` (public) — retourne la liste distincte des valeurs de `periode` en base (pour les filtres dynamiques)

- Enregistrer le routeur dans `main.py`

### Script de seed
- Créer `backend/scripts/seed_library.py` :
  - Parse `docs/sources/histoire_init.txt`
  - Insère les 5 entrées en base
  - Gestion doublons (même titre)
  - Affiche résumé

## Outputs

- `backend/app/schemas/library.py`
- `backend/app/api/library.py`
- `backend/scripts/seed_library.py`
- `backend/app/main.py` modifié

## Tests automatisés à écrire

- `backend/tests/test_library.py` :
  - `test_list_empty` : 200, items=[]
  - `test_list_filter_type` : filtre `?type=Histoire` → résultats filtrés
  - `test_detail` : GET /{id} → 200 avec tous les champs
  - `test_detail_not_found` : GET /{id} inexistant → 404
  - `test_create_without_auth` : 401
  - `test_create_success` : 201
  - `test_create_with_translation_link` : lien bidirectionnel OK
  - `test_update_success` : 200
  - `test_delete_releases_translation_link` : suppression libère le lien dans l'entrée liée
  - `test_periodes_endpoint` : retourne les valeurs distinctes

## Tests manuels (vérification)

- `python -m scripts.seed_library` → 5 entrées importées
- `GET /api/v1/library/periodes` → liste des périodes
- CRUD via Swagger UI fonctionnel

## Critères de "Done"

- [ ] Les 5 endpoints + endpoint périodes fonctionnent
- [ ] Le lien bidirectionnel traduction_id est géré (création + suppression)
- [ ] Les filtres type, période, lieu fonctionnent
- [ ] Le script de seed importe les 5 entrées
- [ ] Les tests passent
