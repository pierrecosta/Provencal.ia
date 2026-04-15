# [TASK-040] Refactoring backend — Extraction logique métier dans la couche services

**Feature :** Architecture backend
**Rôle cible :** Dev Backend
**Priorité :** P1 (important)
**Dépendances :** TASK-039
**Statut :** À faire

## Objectif

Extraire la logique métier (requêtes SQL, validations, transformations) des fichiers routes (`api/*.py`) vers des fichiers services dédiés (`services/*.py`). Actuellement, les routes contiennent à la fois le parsing HTTP, la logique métier et les requêtes SQL — ce qui viole le principe de séparation des responsabilités et rend la logique impossible à tester unitairement sans passer par HTTP.

## Contexte du problème

| Fichier route | Lignes | Contenu mélangé |
|---------------|:------:|-----------------|
| `api/dictionary.py` | 350 | Import CSV, recherche trigram, requêtes SQL complexes |
| `api/library.py` | 286 | CRUD complet + verrouillage + serialisation |
| `api/sayings.py` | 228 | CRUD complet + terme du jour + filtres |
| `api/events.py` | 209 | CRUD + archivage automatique + filtres date |
| `api/articles.py` | 202 | CRUD + filtres catégorie/année |
| `api/translate.py` | 85 | Logique de traduction mot-à-mot |

Seuls `services/locking.py` (59 lignes) et `services/edit_log.py` (105 lignes) sont factorisés.

## Travail attendu

### Créer un fichier service par module métier

- `backend/app/services/sayings.py` — extraire de `api/sayings.py` :
  - `async def get_today_saying(db) -> Saying | None`
  - `async def list_sayings(db, type, localite, page, per_page) -> PaginatedResponse`
  - `async def create_saying(db, data, user_id) -> Saying`
  - `async def update_saying(db, saying_id, data, user_id) -> Saying`
  - `async def delete_saying(db, saying_id, user_id) -> dict`
  - `async def rollback_saying(db, saying_id, user_id) -> Saying`

- `backend/app/services/articles.py` — extraire de `api/articles.py` :
  - `async def list_articles(db, categorie, annee, page, per_page) -> PaginatedResponse`
  - `async def get_article(db, article_id) -> Article`
  - `async def create_article(db, data, user_id) -> Article`
  - `async def update_article(db, article_id, data, user_id) -> Article`
  - `async def delete_article(db, article_id, user_id) -> dict`
  - `async def rollback_article(db, article_id, user_id) -> Article`

- `backend/app/services/events.py` — extraire de `api/events.py` :
  - `async def list_events(db, archive, mois, annee, page, per_page) -> PaginatedResponse`
  - `async def get_event(db, event_id) -> AgendaEvent`
  - `async def create_event(db, data, user_id) -> AgendaEvent`
  - `async def update_event(db, event_id, data, user_id) -> AgendaEvent`
  - `async def delete_event(db, event_id, user_id) -> dict`
  - `async def rollback_event(db, event_id, user_id) -> AgendaEvent`

- `backend/app/services/library.py` — extraire de `api/library.py` :
  - `async def list_library(db, page, per_page) -> PaginatedResponse`
  - `async def get_library_entry(db, entry_id) -> LibraryEntry`
  - `async def create_library_entry(db, data, user_id) -> LibraryEntry`
  - `async def update_library_entry(db, entry_id, data, user_id) -> LibraryEntry`
  - `async def delete_library_entry(db, entry_id, user_id) -> dict`
  - `async def rollback_library_entry(db, entry_id, user_id) -> LibraryEntry`

- `backend/app/services/dictionary.py` — extraire de `api/dictionary.py` :
  - `async def list_themes(db) -> ThemeCategoriesResponse`
  - `async def search_dictionary(db, q, graphie, source, theme, categorie, page, per_page) -> PaginatedResponse`
  - `async def search_provencal(db, q, page, per_page) -> PaginatedResponse`
  - `async def import_csv(db, file_content, encoding) -> dict`

- `backend/app/services/translate.py` — extraire de `api/translate.py` :
  - `async def translate_text(db, text, graphie) -> list[dict]`

### Règles de refactoring

1. **Les routes ne gardent que** : validation des paramètres HTTP, appel au service, retour de la réponse HTTP
2. **Les services reçoivent** : `db: AsyncSession` + paramètres métier typés (pas de `Request`, pas de `Query`)
3. **Les services lèvent** : `HTTPException` pour les erreurs métier (404, 403, 409)
4. **Les helpers de sérialisation** (`_to_response`, `_to_dict`) restent dans les fichiers routes ou migrent dans les schemas
5. **Pas de changement d'API** : les endpoints, URLs, codes de retour et formats de réponse sont identiques

## Outputs

- `backend/app/services/sayings.py`
- `backend/app/services/articles.py`
- `backend/app/services/events.py`
- `backend/app/services/library.py`
- `backend/app/services/dictionary.py`
- `backend/app/services/translate.py`
- Fichiers `api/*.py` allégés (routes thin controllers)

## Tests automatisés à écrire

- `backend/tests/test_services_sayings.py` — tests unitaires du service (sans HTTP) :
  - `test_get_today_saying_empty` — base vide → None
  - `test_get_today_saying_returns_one` — 3 sayings → retourne un saying
  - `test_create_saying_success` — création → saying en base + edit_log
  - `test_update_saying_locked` — saying verrouillé → HTTPException 403
  - `test_delete_saying_not_found` — id inexistant → HTTPException 404

- `backend/tests/test_services_dictionary.py` — tests unitaires du service :
  - `test_search_fr_to_prov` — recherche FR → résultats avec traductions
  - `test_search_prov_to_fr` — recherche Prov → résultats inversés
  - `test_import_csv_valid` — import valide → entrées créées
  - `test_import_csv_encoding` — fichier latin-1 → auto-détection OK

- `backend/tests/test_services_translate.py` — tests unitaires du service :
  - `test_translate_known_words` — mots connus → traductions retournées
  - `test_translate_unknown_word` — mot inconnu → marqué comme non trouvé

- Les 116 tests existants doivent continuer à passer sans modification (tests d'intégration HTTP inchangés)

## Tests manuels (vérification)

- `cd backend && pytest -v` → 116 tests existants + nouveaux tests services passent
- `docker-compose up --build` → API fonctionnelle, Swagger identique
- Tester un CRUD complet via Swagger → comportement inchangé

## Critères de "Done"

- [ ] 6 fichiers services créés avec la logique métier extraite
- [ ] `services/__init__.py` importe les nouveaux modules
- [ ] Fichiers routes allégés (< 80 lignes chacun, hors imports)
- [ ] Nouveaux tests unitaires des services passent
- [ ] 116 tests existants passent sans modification
- [ ] Aucun changement d'API (endpoints, codes retour, formats)
- [ ] Schéma OpenAPI (`/openapi.json`) identique avant/après refactoring
- [ ] `docker-compose up --build` → stack fonctionnelle
- [ ] CRUD complet fonctionnel via Swagger sur au moins 1 module
