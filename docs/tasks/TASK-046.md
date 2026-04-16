# [TASK-046] Dictionnaire — Modification et suppression d'une entrée

**Feature :** Dictionnaire — Backend + Frontend
**Rôle cible :** Dev Full-stack
**Priorité :** P1 (important)
**Dépendances :** TASK-029 (endpoints lecture), TASK-007 (authentification)
**Statut :** À faire

## Objectif

Permettre aux contributeurs authentifiés de modifier et supprimer une entrée du dictionnaire directement depuis la page `/dictionnaire`. Une entrée est composée d'une ligne `dict_entries` (mot français + métadonnées) et de ses traductions `dict_translations` associées (jusqu'à 7 traductions, une par source).

## Contexte fonctionnel

Voir cahier fonctionnel §3.2, sous-section « Modification d'une entrée ».

## Travail attendu — Backend

### Schémas Pydantic
Enrichir `backend/app/schemas/dictionary.py` :
- `DictTranslationIn` : `source: str`, `traduction: str`, `graphie: str | None`, `region: str | None`
- `DictEntryUpdate` : `mot_fr: str`, `synonyme_fr: str | None`, `description: str | None`, `theme: str`, `categorie: str`, `translations: list[DictTranslationIn]`
- `DictEntryDetailOut` : tous les champs de `DictEntryOut` + `translations: list[DictTranslationOut]`, `locked_by: str | None`, `locked_at: datetime | None`

### Endpoints API
Ajouter dans `backend/app/api/dictionary.py` :

| Méthode | Route | Auth | Description |
|---------|-------|:----:|-------------|
| GET | `/dictionary/{id}` | Non | Détail complet d'une entrée (métadonnées + toutes traductions) |
| PUT | `/dictionary/{id}` | Oui | Modifier une entrée. Vérifie que le verrou appartient au demandeur. Remplace l'intégralité des `dict_translations` par le tableau `translations` fourni. Enregistre dans `edit_log` (une entrée `UPDATE` sur `dict_entries`). |
| DELETE | `/dictionary/{id}` | Oui | Supprimer une entrée et ses traductions (CASCADE). Enregistre dans `edit_log`. |

**Règle PUT :** Si `locked_by ≠ current_user` et que le verrou est actif → retourner `423 Locked`. Si l'entrée n'est pas verrouillée par le demandeur, lever une erreur.

**Règle DELETE :** Même vérification de verrou que PUT.

**Règle traductions :** Une source absente du tableau `translations` entraîne la suppression de la ligne `dict_translations` correspondante. Au moins une traduction doit être présente dans le tableau.

### Verrouillage
Les endpoints existants `POST /sayings/{id}/lock` et `DELETE /sayings/{id}/lock` servent de modèle. Ajouter les mêmes endpoints pour le dictionnaire :

| Méthode | Route | Auth | Description |
|---------|-------|:----:|-------------|
| POST | `/dictionary/{id}/lock` | Oui | Acquérir le verrou sur l'entrée (`dict_entries.locked_by`, `locked_at`) |
| DELETE | `/dictionary/{id}/lock` | Oui | Libérer le verrou |

### Service
Créer (ou enrichir) `backend/app/services/dictionary.py` :
- `get_entry_detail(session, id)` → entrée + traductions
- `update_entry(session, id, data, user_id)` → vérifie verrou, met à jour `dict_entries` et remplace `dict_translations`, écrit dans `edit_log`
- `delete_entry(session, id, user_id)` → vérifie verrou, supprime, écrit dans `edit_log`

## Travail attendu — Frontend

- Modifier `frontend/src/pages/DictionnairePage.tsx` :
  - Ajouter un bouton « Modifier » en bout de ligne pour chaque entrée, visible uniquement pour les contributeurs connectés
  - Au clic sur « Modifier » :
    1. Appel `POST /dictionary/{id}/lock`
    2. Appel `GET /dictionary/{id}` pour récupérer le détail complet
    3. Ouverture d'un formulaire inline (ou modal) avec les champs :
       - Mot français (champ texte)
       - Synonyme français (champ texte)
       - Description (textarea)
       - Thème (liste déroulante — 13 valeurs §10.6)
       - Catégorie (champ texte)
       - 7 champs de traduction (un par source, label = code source + nom auteur)
    4. Boutons : **Valider** / **Supprimer** / **Rollback** / **Annuler**
  - Si une ligne est verrouillée par un autre contributeur : icône verrou (terracotta) + tooltip « En cours de modification »
  - Après sauvegarde : appel `DELETE /dictionary/{id}/lock`, rechargement de la ligne modifiée dans la liste

## Outputs

- `backend/app/schemas/dictionary.py` enrichi
- `backend/app/services/dictionary.py` créé ou enrichi
- `backend/app/api/dictionary.py` enrichi (GET /{id}, PUT /{id}, DELETE /{id}, POST /{id}/lock, DELETE /{id}/lock)
- `frontend/src/pages/DictionnairePage.tsx` modifié

## Tests automatisés à écrire

`backend/tests/test_dictionary.py` (enrichir le fichier existant) :

- `test_get_entry_detail` : GET `/dictionary/{id}` → 200, champs métadonnées + translations présents
- `test_update_entry_authenticated` : PUT `/dictionary/{id}` avec token → 200, métadonnées et traductions mises à jour
- `test_update_entry_unauthenticated` : PUT sans token → 401
- `test_update_entry_locked_by_other` : PUT sur entrée verrouillée par un autre user → 423
- `test_delete_entry_authenticated` : DELETE `/dictionary/{id}` avec token → 200 ou 204, entrée absente en base
- `test_delete_entry_unauthenticated` : DELETE sans token → 401
- `test_lock_entry` : POST `/dictionary/{id}/lock` → `locked_by` et `locked_at` renseignés en base
- `test_unlock_entry` : DELETE `/dictionary/{id}/lock` → verrou libéré

## Tests manuels (vérification)

- Visiteur : aucun bouton Modifier visible dans la liste du dictionnaire
- Contributeur connecté : bouton Modifier visible sur chaque ligne
- Ouvrir le formulaire d'une entrée → vérifier que les 7 champs de traduction sont pré-remplis
- Modifier le mot français + une traduction → Valider → la ligne est mise à jour dans la liste
- Supprimer une entrée → confirmation modale → l'entrée disparaît de la liste
- Rollback → l'entrée revient à son état précédent
- Simuler deux contributeurs : le second voit l'icône verrou sur les entrées en cours d'édition

## Critères de "Done"

- [ ] GET `/dictionary/{id}` retourne métadonnées + toutes les traductions
- [ ] PUT `/dictionary/{id}` met à jour l'entrée et ses traductions (verrou vérifié)
- [ ] DELETE `/dictionary/{id}` supprime l'entrée et ses traductions (verrou vérifié)
- [ ] Endpoints lock/unlock fonctionnels
- [ ] Chaque opération est tracée dans `edit_log`
- [ ] Frontend : bouton Modifier visible uniquement pour les contributeurs connectés
- [ ] Frontend : formulaire pré-rempli avec les données existantes
- [ ] Frontend : verrou affiché si entrée en cours d'édition par un autre contributeur
- [ ] Tests backend passants
