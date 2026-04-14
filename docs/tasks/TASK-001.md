# [TASK-001] Connexion asynchrone PostgreSQL (engine + session)

**Feature :** Fondations & Initialisation
**Rôle cible :** Dev Backend
**Priorité :** P0 (bloquant)
**Dépendances :** Aucune
**Statut :** À faire

## Objectif

Mettre en place la couche de connexion asynchrone à PostgreSQL via SQLAlchemy async + asyncpg. Cette brique est le socle de toutes les interactions BDD du projet.

## Inputs

- `backend/app/core/config.py` — variable `DATABASE_URL` déjà définie (`postgresql+asyncpg://...`)
- `backend/requirements.txt` — `sqlalchemy[asyncio]==2.0.36` et `asyncpg==0.30.0` déjà listés
- `.env.example` — `DATABASE_URL=postgresql+asyncpg://provencial_user:changeme@db:5432/provencial_db`

## Travail attendu

- Créer `backend/app/core/database.py` avec :
  - `engine` : `create_async_engine(settings.DATABASE_URL, echo=False)`
  - `async_session_maker` : `async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)`
  - `Base` : `DeclarativeBase` de SQLAlchemy (base pour tous les modèles ORM)
  - `async def get_db()` : générateur async qui yield une session et la ferme proprement (à utiliser comme dépendance FastAPI `Depends(get_db)`)

## Outputs

- Fichier créé : `backend/app/core/database.py`

## Tests automatisés à écrire

- `backend/tests/test_database.py` :
  - Vérifier que `engine` est une instance de `AsyncEngine`
  - Vérifier que `async_session_maker` produit une `AsyncSession`
  - Vérifier que `get_db()` est un générateur async (callable)

## Tests manuels (vérification)

- Lancer `docker-compose up db` puis exécuter un script Python minimaliste qui importe `get_db` et ouvre/ferme une session sans erreur

## Critères de "Done"

- [ ] `backend/app/core/database.py` existe avec `engine`, `async_session_maker`, `Base`, `get_db()`
- [ ] Les imports depuis `app.core.database` fonctionnent sans erreur
- [ ] Le fichier `backend/app/core/__init__.py` n'a pas besoin de modification
- [ ] Aucune régression sur `test_health.py`
