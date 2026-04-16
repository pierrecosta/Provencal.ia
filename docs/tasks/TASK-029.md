# [TASK-029] Dictionnaire — API liste + recherche bidirectionnelle

**Feature :** Dictionnaire — Backend
**Rôle cible :** Dev Backend
**Priorité :** P0 (bloquant)
**Dépendances :** TASK-010
**Statut :** Terminé

## Objectif

Implémenter les endpoints de consultation du dictionnaire : liste paginée FR→Provençal avec filtres (thème, catégorie, graphie, source), recherche avec suggestions Levenshtein via `pg_trgm`, et recherche inversée Provençal→FR. Ces endpoints ne nécessitent pas d'authentification.

## Inputs

- `backend/app/models/dict_entry.py` (TASK-002) — modèle `DictEntry` (mot_fr, synonyme_fr, description, theme, categorie + index trigram sur mot_fr)
- `backend/app/models/dict_translation.py` (TASK-002) — modèle `DictTranslation` (entry_id FK, graphie, source, traduction, region + index trigram sur traduction)
- `backend/app/schemas/pagination.py` (TASK-010) — pagination
- Cahier technique §6.3 — endpoints Dictionnaire :
  - `GET /dictionary` — liste paginée + recherche FR→Prov, params `?q=&dir=fr_to_prov&theme=&categorie=&graphie=&source=&page=1&per_page=20`
  - `GET /dictionary/search` — recherche Prov→FR, params `?q=&dir=prov_to_fr`
- Cahier fonctionnel §3.2 — recherche bidirectionnelle, suggestions mots proches, filtres cascade thème/catégorie, recherche désactive les filtres
- Cahier technique §5.3 — index trigram `gin_trgm_ops` pour recherche approximative

## Travail attendu

### Schémas Pydantic
- Créer `backend/app/schemas/dictionary.py` :
  - `TranslationResponse(BaseModel)` : id, graphie, source, traduction, region. `model_config = ConfigDict(from_attributes=True)`
  - `DictEntryResponse(BaseModel)` : id, mot_fr, synonyme_fr, description, theme, categorie, translations (list[TranslationResponse]). `model_config = ConfigDict(from_attributes=True)`
  - `DictSearchResult(BaseModel)` : entries (list[DictEntryResponse]), suggestions (list[str]) — mots proches si aucun résultat exact
  - `ThemeCategoriesResponse(BaseModel)` : themes (dict[str, list[str]]) — mapping thème → liste de catégories

### Endpoints
- Créer `backend/app/api/dictionary.py` avec un routeur FastAPI (`prefix="/dictionary"`, `tags=["Dictionnaire"]`) :

  1. **`GET /dictionary`** (public) :
     - Si `q` est fourni : recherche textuelle FR→Prov
       - Chercher d'abord les correspondances exactes (`mot_fr ILIKE`)
       - Si aucun résultat exact : utiliser `similarity()` de `pg_trgm` pour des suggestions (mots proches, distance de Levenshtein)
       - Les filtres thème/catégorie/graphie/source sont **ignorés** quand `q` est renseigné (cahier fonctionnel §3.2)
     - Si `q` est vide : liste paginée avec filtres
       - Filtres : `theme` (exact), `categorie` (exact), `graphie` (exact sur traductions), `source` (exact sur traductions)
     - Tri par `mot_fr` alphabétique ASC
     - Chaque entrée inclut ses traductions groupées
     - Pagination standard (défaut per_page=20)
     - Retourne `PaginatedResponse[DictEntryResponse]` + `suggestions` si pertinent

  2. **`GET /dictionary/search`** (public) :
     - Recherche Provençal → FR (toutes graphies confondues)
     - Paramètre `q` obligatoire
     - Chercher dans `dict_translations.traduction` (ILIKE + trigram)
     - Retourner les `DictEntry` parents correspondants
     - Suggestions si pas de résultat exact

  3. **`GET /dictionary/themes`** (public) :
     - Retourne la liste des thèmes avec leurs catégories associées (pour les filtres en cascade)
     - Valeurs dynamiques depuis la base

- Enregistrer le routeur dans `main.py`

### Relation SQLAlchemy
- Ajouter une `relationship("DictTranslation", back_populates="entry")` dans `DictEntry`
- Ajouter une `relationship("DictEntry", back_populates="translations")` dans `DictTranslation`

## Outputs

- `backend/app/schemas/dictionary.py`
- `backend/app/api/dictionary.py`
- `backend/app/models/dict_entry.py` modifié (relationship)
- `backend/app/models/dict_translation.py` modifié (relationship)
- `backend/app/main.py` modifié

## Tests automatisés à écrire

- `backend/tests/test_dictionary.py` :
  - `test_list_empty` : 200, items=[]
  - `test_list_with_data` : entrées avec traductions groupées
  - `test_list_filter_theme` : filtre `?theme=Nature` → résultats filtrés
  - `test_list_filter_cascade` : filtre thème + catégorie
  - `test_search_fr_exact` : `?q=maison` → correspondance exacte
  - `test_search_fr_suggestions` : `?q=maisn` (faute) → suggestions de mots proches
  - `test_search_prov_to_fr` : recherche dans `dictionary/search?q=oustau` → entrée FR correspondante
  - `test_themes_endpoint` : retourne les thèmes avec catégories

## Tests manuels (vérification)

- `GET /api/v1/dictionary?q=maison` → résultats avec traductions
- `GET /api/v1/dictionary?q=maisn` → suggestions (tolérance faute)
- `GET /api/v1/dictionary/search?q=oustau` → résultats Prov→FR
- `GET /api/v1/dictionary/themes` → mapping thème/catégories
- Les filtres fonctionnent et se désactivent quand `q` est renseigné

## Critères de "Done"

- [x] `GET /dictionary` retourne la liste paginée avec traductions groupées
- [x] La recherche FR→Prov fonctionne avec correspondance exacte et suggestions
- [x] `GET /dictionary/search` retourne les résultats Prov→FR
- [x] Les filtres thème/catégorie/graphie/source fonctionnent
- [x] Les filtres sont désactivés quand `q` est renseigné
- [x] `GET /dictionary/themes` retourne les thèmes avec catégories
- [x] Les relations SQLAlchemy sont en place
- [x] Les tests passent
