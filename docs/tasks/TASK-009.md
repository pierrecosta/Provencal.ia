# [TASK-009] Vérification stack complète — docker-compose up

**Feature :** Fondations & Initialisation
**Rôle cible :** TechLead
**Priorité :** P0 (bloquant)
**Dépendances :** TASK-003, TASK-008
**Statut :** À faire

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
   - [ ] Les 3 services démarrent sans erreur dans les logs
   - [ ] PostgreSQL est prêt (log `database system is ready to accept connections`)
   - [ ] Alembic applique la migration (log `Running upgrade -> initial_schema`)
   - [ ] Uvicorn démarre (log `Uvicorn running on http://0.0.0.0:8000`)
   - [ ] Vite démarre (log `Local: http://localhost:5173`)

2. Vérification des endpoints :
   - [ ] `curl http://localhost:8000/health` → `{"status":"ok","environment":"development"}`
   - [ ] `http://localhost:8000/docs` → Swagger UI accessible
   - [ ] `http://localhost:5173` → page React affichée

3. Vérification base de données :
   - [ ] `docker-compose exec db psql -U provencial_user -d provencial_db -c '\dt'` → 8 tables + `alembic_version`
   - [ ] `docker-compose exec db psql -U provencial_user -d provencial_db -c '\dx'` → `pg_trgm` installée

4. Vérification auth (après seed user) :
   - [ ] Créer un user via le script seed
   - [ ] `POST /api/v1/auth/login` → token reçu
   - [ ] `POST /api/v1/auth/logout` avec le token → déconnexion réussie
   - [ ] Réutilisation du token → 401

5. Nettoyage :
   - [ ] `docker-compose down -v` → arrêt propre, volumes supprimés

## Critères de "Done"

- [ ] `docker-compose up --build` démarre les 3 services sans erreur
- [ ] Les migrations Alembic s'appliquent automatiquement au démarrage du backend
- [ ] Les 8 tables sont créées en BDD avec `pg_trgm`
- [ ] `/health` retourne 200
- [ ] Swagger UI est accessible
- [ ] Le frontend React est accessible sur le port 5173
- [ ] Le cycle login/logout fonctionne de bout en bout
- [ ] `docker-compose down -v` nettoie tout proprement
