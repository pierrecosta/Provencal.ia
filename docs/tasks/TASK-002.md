# [TASK-002] Modèles SQLAlchemy — 8 tables ORM

**Feature :** Fondations & Initialisation
**Rôle cible :** Dev Backend
**Priorité :** P0 (bloquant)
**Dépendances :** TASK-001
**Statut :** Terminé

## Objectif

Déclarer les 8 modèles SQLAlchemy ORM correspondant au schéma relationnel défini dans `docs/sources/db_schema_init.sql`. Ces modèles sont la couche d'accès aux données pour toute l'API.

## Inputs

- `docs/sources/db_schema_init.sql` — script SQL de référence (CREATE TABLE complet)
- `backend/app/core/database.py` (TASK-001) — `Base` déclarative
- Cahier technique §5.2 — détail de chaque table, contraintes, index, FK

## Travail attendu

- Créer `backend/app/models/` (package Python avec `__init__.py`)
- Créer un fichier par table :
  - `backend/app/models/user.py` → table `users` (id, pseudo, password_hash, created_at)
  - `backend/app/models/dict_entry.py` → table `dict_entries` (id, mot_fr, synonyme_fr, description, theme, categorie, locked_by, locked_at, created_by, created_at + index trigram sur mot_fr)
  - `backend/app/models/dict_translation.py` → table `dict_translations` (id, entry_id FK, graphie, source, traduction, region, locked_by, locked_at, created_by, created_at + index trigram sur traduction)
  - `backend/app/models/agenda_event.py` → table `agenda_events` (id, titre, date_debut, date_fin, lieu, description, lien_externe, locked_by, locked_at, created_by, created_at + CHECK date_fin >= date_debut)
  - `backend/app/models/library_entry.py` → table `library_entries` (id, titre, typologie CHECK in Histoire/Légende, periode, description_courte, description_longue, source_url, image_ref, lang default 'fr', traduction_id self-FK, locked_by, locked_at, created_by, created_at)
  - `backend/app/models/article.py` → table `articles` (id, titre, description, image_ref, source_url, date_publication, auteur, categorie CHECK in 20 valeurs, locked_by, locked_at, created_by, created_at)
  - `backend/app/models/saying.py` → table `sayings` (id, terme_provencal, localite_origine, traduction_sens_fr, type CHECK in Dicton/Expression/Proverbe, contexte, source, locked_by, locked_at, created_by, created_at + index trigram sur terme_provencal)
  - `backend/app/models/edit_log.py` → table `edit_log` (id, table_name, row_id, action CHECK in INSERT/UPDATE/DELETE, old_data JSONB, new_data JSONB, done_by FK, done_at)
- Créer `backend/app/models/__init__.py` qui importe tous les modèles (pour qu'Alembic les détecte via `Base.metadata`)
- Toutes les FK `locked_by` et `created_by` pointent vers `users.id` avec `ON DELETE SET NULL`
- Les relations SQLAlchemy (`relationship`) ne sont **pas** requises dans cette tâche — les ajouter module par module plus tard

## Outputs

- Répertoire `backend/app/models/` avec 9 fichiers (8 modèles + `__init__.py`)

## Tests automatisés à écrire

- `backend/tests/test_models.py` :
  - Vérifier que tous les modèles sont importables depuis `app.models`
  - Vérifier que `Base.metadata.tables` contient exactement les 8 noms de table attendus : `users`, `dict_entries`, `dict_translations`, `agenda_events`, `library_entries`, `articles`, `sayings`, `edit_log`
  - Vérifier que chaque modèle a un attribut `__tablename__`

## Tests manuels (vérification)

- Lancer Python et exécuter `from app.models import *` sans erreur
- Vérifier que `Base.metadata.sorted_tables` liste 8 tables

## Critères de "Done"

- [x] 8 fichiers de modèles dans `backend/app/models/`
- [x] `__init__.py` importe tous les modèles
- [x] Les types de colonnes, FK, CHECK constraints et index trigram correspondent au schéma SQL de référence
- [x] `test_models.py` passe
- [x] Aucune régression sur `test_health.py`
