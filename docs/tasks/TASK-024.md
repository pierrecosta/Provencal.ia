# [TASK-024] Articles — API CRUD (4 endpoints) + seed

**Feature :** Actualités — Backend
**Rôle cible :** Dev Backend
**Priorité :** P1 (important)
**Dépendances :** TASK-010
**Statut :** Terminé

## Objectif

Implémenter les 4 endpoints CRUD du module Articles culturels et le script de seed, avec tri par `date_publication DESC`, filtre par catégorie (20 valeurs), verrouillage et journalisation.

## Inputs

- `backend/app/models/article.py` (TASK-002) — modèle `Article` (titre, description, image_ref, source_url, date_publication, auteur, categorie, locked_by, locked_at, created_by, created_at)
- `backend/app/services/locking.py` (TASK-010) — `acquire_lock`, `release_lock`
- `backend/app/services/edit_log.py` (TASK-010) — `log_action`
- `backend/app/schemas/pagination.py` (TASK-010) — `PaginationParams`, `PaginatedResponse`
- `backend/app/api/deps.py` (TASK-005) — `get_current_user`
- `docs/sources/articles_init.txt` — 4 articles culturels de test
- Cahier technique §6.3 — endpoints Articles :
  - `GET /articles` — liste triée `date_publication DESC`, filtres `?categorie=&annee=&mois=`
  - `POST /articles` (auth)
  - `PUT /articles/{id}` (auth, verrou)
  - `DELETE /articles/{id}` (auth)
- Cahier fonctionnel §3.6 — 20 catégories fermées, pas de pagination au-delà de 20 articles
- Cahier fonctionnel §10.1 — les 20 catégories d'articles

## Travail attendu

### Schémas Pydantic
- Créer `backend/app/schemas/article.py` :
  - `ARTICLE_CATEGORIES` : liste des 20 valeurs (constante réutilisable)
  - `ArticleCreate(BaseModel)` : titre (str, max 200, obligatoire), description (Optional[str], max 300), image_ref (Optional[str], max 500), source_url (Optional[str], max 500), date_publication (date, obligatoire), auteur (Optional[str], max 100), categorie (Optional[str], validé parmi les 20 valeurs)
  - `ArticleUpdate(BaseModel)` : mêmes champs, tous optionnels
  - `ArticleResponse(BaseModel)` : id + tous les champs + created_at + locked_by + is_locked. `model_config = ConfigDict(from_attributes=True)`

### Endpoints
- Créer `backend/app/api/articles.py` avec un routeur FastAPI (`prefix="/articles"`, `tags=["Actualités"]`) :

  1. **`GET /articles`** (public) :
     - Tri par `date_publication DESC`
     - Filtres : `categorie` (exact match, optionnel), `annee` (int), `mois` (int)
     - Pagination via `PaginationParams` (défaut per_page=20)
     - Retourne `PaginatedResponse[ArticleResponse]`

  2. **`POST /articles`** (auth requise) :
     - Body : `ArticleCreate`
     - `created_by = current_user.id`
     - Log action INSERT dans `edit_log`
     - Retourne `ArticleResponse`, status 201

  3. **`PUT /articles/{id}`** (auth requise) :
     - Vérifier existence (404)
     - Acquérir le verrou
     - Mettre à jour, log UPDATE, libérer le verrou
     - Retourne `ArticleResponse`

  4. **`DELETE /articles/{id}`** (auth requise) :
     - Vérifier existence (404)
     - Log DELETE, supprimer
     - Retourne `{ "message": "Article supprimé" }`

- Enregistrer le routeur dans `backend/app/main.py`

### Script de seed
- Créer `backend/scripts/seed_articles.py` :
  - Parse `docs/sources/articles_init.txt`
  - Insère les 4 articles en base
  - Gestion doublons (même titre + date_publication)
  - Affiche résumé : `Importé : XX | Ignoré : YY | Total : 4`

## Outputs

- `backend/app/schemas/article.py`
- `backend/app/api/articles.py`
- `backend/scripts/seed_articles.py`
- `backend/app/main.py` modifié

## Tests automatisés à écrire

- `backend/tests/test_articles.py` :
  - `test_list_empty` : 200, items=[], total=0
  - `test_list_sorted_by_date` : 3 articles → triés par date_publication DESC
  - `test_list_filter_categorie` : filtre `?categorie=Gastronomie` → résultats filtrés
  - `test_create_without_auth` : 401
  - `test_create_invalid_categorie` : catégorie hors liste → 422
  - `test_create_success` : 201
  - `test_update_success` : 200
  - `test_delete_success` : 200

## Tests manuels (vérification)

- `python -m scripts.seed_articles` → 4 articles importés
- `GET /api/v1/articles` → liste triée par date décroissante
- CRUD via Swagger UI fonctionnel

## Critères de "Done"

- [x] Les 4 endpoints fonctionnent
- [x] Le tri par `date_publication DESC` est appliqué
- [x] Le filtre par catégorie valide parmi les 20 valeurs
- [x] Le verrouillage et le logging fonctionnent
- [x] Le script de seed importe les 4 articles
- [x] Les tests passent
