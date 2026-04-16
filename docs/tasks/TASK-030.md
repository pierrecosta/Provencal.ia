# [TASK-030] Dictionnaire — API import CSV/XLSX

**Feature :** Dictionnaire — Backend
**Rôle cible :** Dev Backend
**Priorité :** P0 (bloquant)
**Dépendances :** TASK-029
**Statut :** Terminé

## Objectif

Implémenter l'endpoint `POST /dictionary/import` qui permet l'import du dictionnaire depuis un fichier CSV ou XLSX (13 colonnes exactes). L'import est transactionnel : il s'arrête à la première erreur et le script de seed permet d'importer le fichier `src_dict.csv` (6 049 entrées).

## Inputs

- `backend/app/models/dict_entry.py`, `dict_translation.py` (TASK-002) — modèles
- Cahier technique §7 — spécifications complètes de l'import :
  - Format : CSV (`;`) ou XLSX
  - 13 colonnes exactes
  - Encodage : auto-détection, UTF-8 par défaut
  - Première ligne = en-tête
  - Arrêt à la première erreur (nombre de colonnes ≠ 13, doublon mot_fr + thème + catégorie)
  - Au moins 1 des colonnes 6–13 non vide
- Cahier technique §7.3 — structure des 13 colonnes
- Cahier technique §7.4 — correspondance code source ↔ auteur (TradEG, TradD, TradA, TradH, TradAv, TradP, TradX)
- `docs/sources/src_dict.csv` — 6 049 entrées réelles
- `backend/requirements.txt` — ajouter `openpyxl` si nécessaire pour le support XLSX

## Travail attendu

### Endpoint d'import
- Ajouter dans `backend/app/api/dictionary.py` :
  - `POST /dictionary/import` (auth requise) :
    - Accepte `multipart/form-data` avec un champ `file`
    - Types acceptés : `.csv`, `.xlsx`
    - Logique :
      1. Détecter le type (extension)
      2. Pour CSV : détecter l'encodage (chardet ou BOM), parser avec `;` comme séparateur
      3. Pour XLSX : parser avec openpyxl
      4. Vérifier la première ligne (en-tête)
      5. Pour chaque ligne :
         - Vérifier 13 colonnes exactement (sinon erreur + numéro de ligne)
         - Vérifier au moins 1 colonne de traduction (6–13) non vide
         - Vérifier pas de doublon `mot_fr + theme + categorie`
         - Créer `DictEntry` (colonnes 1–5)
         - Créer les `DictTranslation` pour chaque colonne 6–13 non vide, avec la graphie et la source associées
      6. En cas d'erreur : rollback complet, retourner le numéro de ligne fautive
    - Réponses :
      - `200` : `{ "imported": N, "skipped": 0 }`
      - `400` : `{ "error": "Ligne 42 : 11 colonnes trouvées, 13 attendues" }`
      - `409` : `{ "error": "Ligne 15 : doublon (mot_fr + thème + catégorie)" }`

### Mapping colonnes → traductions
| Colonne | Source code | Graphie |
|---------|-----------|---------|
| 6 (Traduction) | — | `canonique` |
| 7 (TradEG) | `TradEG` | `pre_mistralienne` |
| 8 (TradD) | `TradD` | `pre_mistralienne` |
| 9 (TradA) | `TradA` | `pre_mistralienne` |
| 10 (TradH) | `TradH` | `pre_mistralienne` |
| 11 (TradAv) | `TradAv` | `pre_mistralienne` |
| 12 (TradP) | `TradP` | `pre_mistralienne` |
| 13 (TradX) | `TradX` | `mistralienne` |

### Script de seed
- Créer `backend/scripts/seed_dictionary.py` :
  - Exécute l'import de `docs/sources/src_dict.csv` via l'API ou directement en base
  - Peut être exécuté en standalone : `python -m scripts.seed_dictionary`
  - Affiche résumé : `Importé : XX entrées, YY traductions`

### Dépendance
- Ajouter `openpyxl` et `chardet` dans `backend/requirements.txt` si nécessaire

## Outputs

- `backend/app/api/dictionary.py` modifié (ajout endpoint import)
- `backend/scripts/seed_dictionary.py`
- `backend/requirements.txt` modifié (ajout openpyxl, chardet si nécessaire)

## Tests automatisés à écrire

- `backend/tests/test_dictionary_import.py` :
  - `test_import_without_auth` : 401
  - `test_import_invalid_file_type` : fichier .txt → 400
  - `test_import_wrong_column_count` : ligne avec 11 colonnes → 400 + numéro de ligne
  - `test_import_no_translation` : toutes colonnes 6–13 vides → 400
  - `test_import_duplicate` : doublon mot_fr + thème + catégorie → 409
  - `test_import_success` : petit CSV valide → 200 + `imported` correct
  - `test_import_creates_translations` : vérifier que les traductions sont créées avec les bonnes sources et graphies

## Tests manuels (vérification)

- `python -m scripts.seed_dictionary` → 6 049 entrées importées
- `GET /api/v1/dictionary?q=maison` → résultats avec traductions multiples
- Upload d'un fichier CSV avec erreur → message d'erreur avec numéro de ligne

## Critères de "Done"

- [x] L'endpoint accepte CSV (`;`) et XLSX
- [x] La détection d'encodage fonctionne
- [x] 13 colonnes exactement vérifiées par ligne
- [x] Les doublons sont détectés (mot_fr + thème + catégorie)
- [x] Les traductions sont créées avec les bonnes sources et graphies
- [x] Le rollback est complet en cas d'erreur
- [x] Le script de seed importe les 6 049 entrées de `src_dict.csv`
- [x] Les tests passent
