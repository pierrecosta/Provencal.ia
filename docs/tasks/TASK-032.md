# [TASK-032] Traducteur — API POST /translate (mot-à-mot)

**Feature :** Traducteur lexical — Backend
**Rôle cible :** Dev Backend
**Priorité :** P1 (important)
**Dépendances :** TASK-029
**Statut :** À faire

## Objectif

Implémenter l'endpoint `POST /translate` qui effectue une traduction lexicale mot-à-mot du français vers le provençal. Chaque mot est recherché dans le dictionnaire et remplacé par sa traduction la plus courante. Les mots inconnus sont conservés et signalés.

## Inputs

- `backend/app/models/dict_entry.py`, `dict_translation.py` (TASK-002) — modèles + relations
- Cahier fonctionnel §3.3 — traducteur mot-à-mot :
  - Ponctuation conservée
  - Mots inconnus conservés tels quels et signalés
  - Pas d'accord ni conjugaison
- Cahier technique §6.3 — endpoint :
  - `POST /translate` (public), body `{ "text": "..." }`, retourne `{ "translated": "...", "unknown_words": [...] }`

## Travail attendu

### Schéma Pydantic
- Créer `backend/app/schemas/translate.py` :
  - `TranslateRequest(BaseModel)` : text (str, max 5000 caractères)
  - `TranslateResponse(BaseModel)` : translated (str), unknown_words (list[str])

### Endpoint
- Ajouter dans un nouveau routeur `backend/app/api/translate.py` (`prefix="/translate"`, `tags=["Traducteur"]`) :
  - `POST /translate` (public, pas d'auth) :
    1. Tokeniser le texte en mots et ponctuation (conserver la ponctuation à sa position)
    2. Pour chaque mot :
       - Chercher dans `dict_entries.mot_fr` (ILIKE, insensible à la casse)
       - Si trouvé : prendre la première traduction disponible (priorité : colonne 6 "Traduction" canonique, sinon première source disponible)
       - Si non trouvé : conserver le mot original, l'ajouter à `unknown_words`
    3. Reconstituer la phrase avec la ponctuation
    4. Retourner le texte traduit + la liste des mots inconnus (dédupliquée)

### Optimisation
- Charger tous les mots FR uniques du texte en une seule requête (pas une requête par mot)
- Utiliser un mapping en mémoire pour la traduction

- Enregistrer le routeur dans `main.py`

## Outputs

- `backend/app/schemas/translate.py`
- `backend/app/api/translate.py`
- `backend/app/main.py` modifié

## Tests automatisés à écrire

- `backend/tests/test_translate.py` :
  - `test_translate_empty` : texte vide → `{ "translated": "", "unknown_words": [] }`
  - `test_translate_single_word` : mot connu → traduit
  - `test_translate_unknown_word` : mot inconnu → conservé + dans `unknown_words`
  - `test_translate_punctuation` : ponctuation conservée à la bonne position
  - `test_translate_mixed` : phrase avec mots connus et inconnus → résultat mixte
  - `test_translate_case_insensitive` : « Maison » et « maison » → même traduction

## Tests manuels (vérification)

- `POST /api/v1/translate` avec `{ "text": "la maison est belle" }` → texte traduit + mots inconnus
- La ponctuation (virgules, points) est conservée
- Les mots inconnus sont listés et dédupliqués

## Critères de "Done"

- [ ] L'endpoint traduit chaque mot individuellement
- [ ] La ponctuation est conservée
- [ ] Les mots inconnus sont conservés dans le texte et listés dans `unknown_words`
- [ ] La recherche est insensible à la casse
- [ ] Les mots sont chargés en batch (pas une requête par mot)
- [ ] Les tests passent
