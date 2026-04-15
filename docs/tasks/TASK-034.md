# [TASK-034] Backend — Endpoint Rollback (annulation dernière action)

**Feature :** Socle transversal — Backend
**Rôle cible :** Dev Backend
**Priorité :** P1 (important)
**Dépendances :** TASK-010
**Statut :** À faire

## Objectif

Implémenter le mécanisme de rollback permettant d'annuler la dernière action effectuée sur un élément donné, en utilisant le journal `edit_log`. Le rollback est générique et fonctionne pour tous les modules éditoriaux (sayings, events, library, articles).

## Inputs

- `backend/app/services/edit_log.py` (TASK-010) — `get_last_log()` pour récupérer la dernière entrée du journal
- `backend/app/models/edit_log.py` (TASK-002) — modèle `EditLog` (table_name, row_id, action, old_data, new_data)
- Cahier fonctionnel §7.4 — rollback limité à la dernière action uniquement

## Travail attendu

### Endpoint générique de rollback
- Créer (ou ajouter dans chaque routeur de module) un endpoint de rollback :
  - `POST /api/v1/{module}/{id}/rollback` (auth requise)
  - Où `{module}` correspond au préfixe de chaque module : `sayings`, `events`, `library`, `articles`

- Logique de rollback dans `backend/app/services/edit_log.py` :
  - `async def rollback_last_action(db, table_name, row_id, current_user_id)` :
    1. Récupérer la dernière entrée `edit_log` pour `(table_name, row_id)`
    2. Si aucune entrée → erreur 404 « Aucune action à annuler »
    3. Selon l'action :
       - **INSERT** → supprimer la ligne (`DELETE`)
       - **UPDATE** → restaurer `old_data` (réécrire les champs depuis le JSONB)
       - **DELETE** → recréer la ligne avec `old_data`
    4. Supprimer l'entrée `edit_log` traitée (le rollback est à usage unique)
    5. Retourner un message de confirmation

### Ajout aux routeurs existants
- Ajouter `POST /sayings/{id}/rollback` dans `sayings.py`
- Ajouter `POST /events/{id}/rollback` dans `events.py` (TASK-021)
- Ajouter `POST /library/{id}/rollback` dans `library.py` (TASK-027)
- Ajouter `POST /articles/{id}/rollback` dans `articles.py` (TASK-024)

## Outputs

- `backend/app/services/edit_log.py` modifié (ajout `rollback_last_action`)
- `backend/app/api/sayings.py` modifié (ajout endpoint rollback)
- `backend/app/api/events.py` modifié (ajout endpoint rollback)
- `backend/app/api/library.py` modifié (ajout endpoint rollback, si créé)
- `backend/app/api/articles.py` modifié (ajout endpoint rollback, si créé)

## Tests automatisés à écrire

- `backend/tests/test_rollback.py` :
  - `test_rollback_no_log` : aucune action → 404
  - `test_rollback_insert` : créer un saying → rollback → le saying est supprimé
  - `test_rollback_update` : modifier un saying → rollback → les anciennes valeurs sont restaurées
  - `test_rollback_delete` : supprimer un saying → rollback → le saying est recréé avec ses données originales
  - `test_rollback_one_shot` : rollback → re-rollback sur le même élément → 404 (le log a été consommé)
  - `test_rollback_without_auth` : 401

## Tests manuels (vérification)

- Créer un saying via POST → rollback → le saying disparaît
- Modifier un saying via PUT → rollback → les anciennes valeurs sont restaurées
- Supprimer un saying → rollback → le saying réapparaît
- Rollback une deuxième fois → erreur « Aucune action à annuler »

## Critères de "Done"

- [ ] Le service `rollback_last_action` gère les 3 types d'action (INSERT, UPDATE, DELETE)
- [ ] L'entrée `edit_log` est supprimée après rollback (usage unique)
- [ ] Les endpoints rollback sont ajoutés aux 4 routeurs de modules
- [ ] Le rollback est protégé par authentification
- [ ] Les tests passent
