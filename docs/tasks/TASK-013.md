# [TASK-013] Sayings — Script de seed (sayings_init.txt)

**Feature :** Mémoire vivante — Backend
**Rôle cible :** Dev Backend
**Priorité :** P1 (important)
**Dépendances :** TASK-011
**Statut :** À faire

## Objectif

Importer les 30 entrées de test du fichier `docs/sources/sayings_init.txt` en base de données via un script Python autonome. Ce script permet de disposer de données réalistes pour le développement et les tests manuels du module Mémoire vivante.

## Inputs

- `docs/sources/sayings_init.txt` — 30 entrées (10 dictons, 10 expressions, 10 proverbes) au format texte structuré
- `backend/app/models/saying.py` (TASK-002) — modèle `Saying`
- `backend/app/core/database.py` (TASK-001) — `engine`, `async_session_maker`
- `backend/scripts/seed_user.py` (TASK-007) — pattern de script standalone à réutiliser

## Travail attendu

- Lire et analyser le format de `docs/sources/sayings_init.txt` pour comprendre la structure des données
- Créer `backend/scripts/seed_sayings.py` :
  - Script exécutable en standalone : `python -m scripts.seed_sayings` (depuis `backend/`)
  - Parse le fichier `docs/sources/sayings_init.txt`
  - Insère les 30 entrées dans la table `sayings` via SQLAlchemy
  - Gère les doublons : si une entrée avec le même `terme_provencal` existe déjà, la sauter (skip, pas d'erreur)
  - Affiche un résumé : `Importé : XX | Ignoré (doublons) : YY | Total : 30`
  - Utilise `asyncio.run()` pour exécuter les opérations async

## Outputs

- `backend/scripts/seed_sayings.py`

## Tests automatisés à écrire

- Pas de test automatisé (script de maintenance, vérification manuelle)

## Tests manuels (vérification)

- `docker-compose up db` → attendre PostgreSQL
- `cd backend && source .venv/bin/activate && export $(grep -v '^#' ../.env | xargs)`
- `alembic upgrade head` (si pas déjà fait)
- `python -m scripts.seed_sayings` → résumé affiché
- Relancer → tous ignorés (doublons)
- `GET http://localhost:8000/api/v1/sayings` → 30 résultats
- `GET http://localhost:8000/api/v1/sayings/today` → un terme du jour

## Critères de "Done"

- [ ] Script exécutable depuis `backend/`
- [ ] 30 entrées importées correctement (types, localités, traductions cohérents)
- [ ] Pas d'erreur en cas de réexécution (gestion doublons)
- [ ] Les données sont visibles via l'API (`GET /sayings`)
