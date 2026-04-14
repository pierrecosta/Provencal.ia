# [TASK-003] Alembic — Initialisation et migration initiale

**Feature :** Fondations & Initialisation
**Rôle cible :** Dev Backend
**Priorité :** P0 (bloquant)
**Dépendances :** TASK-001, TASK-002
**Statut :** À faire

## Objectif

Initialiser Alembic pour le versionnement du schéma BDD et générer la première migration qui crée les 8 tables + l'extension `pg_trgm`. Après cette tâche, `alembic upgrade head` crée un schéma fonctionnel à partir d'une base vide.

## Inputs

- `backend/app/core/database.py` (TASK-001) — `Base`, `engine`
- `backend/app/models/` (TASK-002) — 8 modèles ORM
- `backend/requirements.txt` — `alembic==1.14.0` déjà listé
- `backend/app/core/config.py` — `settings.DATABASE_URL`

## Travail attendu

- Exécuter `alembic init backend/alembic` depuis le dossier `backend/` (structure async)
- Configurer `backend/alembic.ini` :
  - `sqlalchemy.url` : laisser vide (sera lu depuis `env.py`)
- Configurer `backend/alembic/env.py` :
  - Importer `settings.DATABASE_URL` depuis `app.core.config`
  - Importer `Base.metadata` depuis `app.core.database`
  - Importer tous les modèles depuis `app.models` (pour que metadata les connaisse)
  - Configurer le mode **async** (`run_async_migrations`) avec `asyncpg`
- Générer la première migration : `alembic revision --autogenerate -m "initial_schema"`
- Vérifier que le fichier de migration généré contient :
  - `CREATE EXTENSION IF NOT EXISTS pg_trgm` (dans la fonction `upgrade`, avant les CREATE TABLE) — à ajouter manuellement si Alembic ne le génère pas
  - Les 8 CREATE TABLE
  - Les index trigram (gin_trgm_ops) sur `dict_entries.mot_fr`, `dict_translations.traduction`, `sayings.terme_provencal`
  - Les CHECK constraints
- Tester : `docker-compose up db` puis `alembic upgrade head` → aucune erreur

## Outputs

- `backend/alembic.ini`
- `backend/alembic/` (répertoire complet : `env.py`, `script.py.mako`, `versions/`)
- `backend/alembic/versions/xxxx_initial_schema.py` — première migration

## Tests automatisés à écrire

- `backend/tests/test_alembic.py` :
  - Vérifier que `alembic.ini` existe et est parsable
  - Vérifier que le répertoire `alembic/versions/` contient au moins un fichier `.py`

## Tests manuels (vérification)

- `docker-compose up db` → attendre que PostgreSQL soit prêt
- `cd backend && alembic upgrade head` → aucune erreur
- Se connecter à la base et vérifier : `\dt` liste 8 tables + `alembic_version`
- Vérifier : `\dx` liste `pg_trgm`
- `alembic downgrade base` → toutes les tables supprimées (sauf alembic_version)

## Critères de "Done"

- [ ] `alembic.ini` et `alembic/env.py` configurés en mode async
- [ ] Migration initiale générée et contient les 8 tables + `pg_trgm`
- [ ] `alembic upgrade head` s'exécute sans erreur sur une base vide
- [ ] `alembic downgrade base` fonctionne (réversible)
- [ ] Aucune régression sur les tests existants
