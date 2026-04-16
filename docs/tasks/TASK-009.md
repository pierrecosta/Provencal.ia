# [TASK-009] Vérification stack complète — docker-compose up

**Feature :** Fondations & Initialisation
**Rôle cible :** TechLead
**Priorité :** P0 (bloquant)
**Dépendances :** TASK-003, TASK-008
**Statut :** Terminé

## Objectif

Valider que les 3 services (PostgreSQL, FastAPI, React/Vite) démarrent ensemble via `docker-compose up --build` sans erreur, communiquent entre eux, et que le cycle complet fonctionne : BDD initialisée → API accessible → frontend affiché.

## Inputs

- `docker-compose.yml` — 3 services (db, backend, frontend)
- `.env.example` → `.env` (copie)
- Toutes les tâches précédentes (TASK-001 à TASK-008)
- Cahier technique §2.3 — docker-compose, ports 5432/8000/5173

## Travail attendu

- Copier `.env.example` en `.env` (si pas déjà fait)
- Modifier `docker-compose.yml` si nécessaire :
  - Ajouter un healthcheck sur le service `db` pour que `backend` attende que PostgreSQL soit prêt
  - Ajouter la commande Alembic au démarrage du backend : `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload` (ou via un script `entrypoint.sh`)
- Créer `backend/entrypoint.sh` (si approche script) :
  ```bash
  #!/bin/bash
  set -e
  alembic upgrade head
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
  ```
- Mettre à jour `backend/Dockerfile` : `CMD ["bash", "entrypoint.sh"]` (si approche script)
- Lancer `docker-compose up --build` et vérifier les 3 services
- Créer un user de test via le script seed (TASK-007) et valider le login

## Outputs

- `docker-compose.yml` potentiellement modifié (healthcheck, entrypoint)
- `backend/entrypoint.sh` (si nécessaire)
- `backend/Dockerfile` potentiellement modifié

## Tests automatisés à écrire

- Pas de test automatisé — cette tâche est une vérification d'intégration manuelle

## Tests manuels (vérification)

**Checklist complète de validation :**

1. `cp .env.example .env && docker-compose up --build`
   - [x] Les 3 services démarrent sans erreur dans les logs
   - [x] PostgreSQL est prêt (log `database system is ready to accept connections`)
   - [x] Alembic applique la migration (log `Running upgrade -> initial_schema`)
   - [x] Uvicorn démarre (log `Uvicorn running on http://0.0.0.0:8000`)
   - [x] Vite démarre (log `Local: http://localhost:5173`)

2. Vérification des endpoints :
   - [x] `curl http://localhost:8000/health` → `{"status":"ok","environment":"development"}`
   - [x] `http://localhost:8000/docs` → Swagger UI accessible
   - [x] `http://localhost:5173` → page React affichée

3. Vérification base de données :
   - [x] `docker-compose exec db psql -U provencial_user -d provencial_db -c '\dt'` → 8 tables + `alembic_version`
   - [x] `docker-compose exec db psql -U provencial_user -d provencial_db -c '\dx'` → `pg_trgm` installée

4. Vérification auth (après seed user) :
   - [x] Créer un user via le script seed
   - [x] `POST /api/v1/auth/login` → token reçu
   - [x] `POST /api/v1/auth/logout` avec le token → déconnexion réussie
   - [x] Réutilisation du token → 401

5. Nettoyage :
   - [x] `docker-compose down -v` → arrêt propre, volumes supprimés

## Critères de "Done"

- [x] `docker-compose up --build` démarre les 3 services sans erreur
- [x] Les migrations Alembic s'appliquent automatiquement au démarrage du backend
- [x] Les 8 tables sont créées en BDD avec `pg_trgm`
- [x] `/health` retourne 200
- [x] Swagger UI est accessible
- [x] Le frontend React est accessible sur le port 5173
- [x] Le cycle login/logout fonctionne de bout en bout
- [x] `docker-compose down -v` nettoie tout proprement
