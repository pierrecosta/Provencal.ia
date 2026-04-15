# Provencal.ia

Portail culturel dédié à la valorisation de la langue provençale : dictionnaire bilingue, patrimoine narratif, agenda culturel et mémoire orale.

**Domaine :** [le-provencal.ovh](https://le-provencal.ovh)

---

## Fonctionnalités

| Module | Description |
|---|---|
| **Dictionnaire FR ↔ Provençal** | Recherche bidirectionnelle avec filtres par graphie (mistralienne / classique IEO), source lexicographique et thème. Import CSV/Excel. |
| **Traducteur lexical** | Traduction mot à mot du français vers le provençal, en temps réel. |
| **Mémoire vivante** | Dictons, expressions et proverbes avec terme du jour en page d'accueil. |
| **Bibliothèque** | Histoires et légendes provençales, description longue en Markdown, version bilingue FR/Provençal. |
| **Articles** | Contenus éditoriaux (actualités, culture, histoire). |
| **Agenda culturel** | Événements à venir et archives, archivage automatique à date dépassée. |
| **Authentification** | Accès contributeur sur invitation uniquement (JWT, pas d'inscription publique). |

---

## Stack technique

- **Frontend :** React 18 + TypeScript, Vite
- **Backend :** FastAPI (Python 3.12), Uvicorn
- **Base de données :** PostgreSQL 16, SQLAlchemy async, Alembic
- **Conteneurisation :** Docker + docker-compose

---

## Prérequis

| Outil | Version minimale | Vérification |
|---|---|---|
| Docker | 29+ | `docker --version` |
| docker-compose | 1.29+ | `docker-compose --version` |

---

## Lancer le projet en local

```bash
cp .env.example .env
# Éditer .env avec les valeurs souhaitées
sudo docker-compose up --build
```

### Ports exposés

| Service | Port | URL |
|---|---|---|
| Frontend (React/Vite) | 5173 | http://localhost:5173 |
| Backend (FastAPI) | 8000 | http://localhost:8000 |
| PostgreSQL | 5432 | — |

---

## Variables d'environnement

Copier `.env.example` en `.env` et renseigner les valeurs :

| Variable | Rôle |
|---|---|
| `POSTGRES_USER` | Nom d'utilisateur PostgreSQL |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL |
| `POSTGRES_DB` | Nom de la base de données |
| `DATABASE_URL` | URL de connexion async pour SQLAlchemy (`postgresql+asyncpg://...`) |
| `SECRET_KEY` | Clé secrète pour la signature des tokens JWT — générer une valeur longue et aléatoire |
| `ALGORITHM` | Algorithme JWT (valeur : `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Durée de validité d'un token JWT en minutes |
| `VITE_API_URL` | URL de l'API backend utilisée par le frontend |

---

## Documentation API

La documentation interactive (Swagger UI) est disponible automatiquement une fois le backend démarré :

- **Swagger UI :** http://localhost:8000/docs
- **ReDoc :** http://localhost:8000/redoc

---

## Tests

Les tests backend sont écrits avec `pytest` et `pytest-asyncio`.

**Dans le conteneur (recommandé) :**
```bash
sudo docker-compose exec backend pytest
```

**En local (avec environnement Python actif) :**
```bash
cd backend
pip install -r requirements.txt
pytest
```

---

## Workflow de développement

### Hot-reload

Le frontend (Vite) et le backend (Uvicorn avec `--reload`) rechargent automatiquement les fichiers modifiés à la sauvegarde, sans redémarrer les conteneurs.

### Migrations Alembic

```bash
# Générer une nouvelle migration après modification des modèles
sudo docker-compose exec backend alembic revision --autogenerate -m "description"

# Appliquer les migrations
sudo docker-compose exec backend alembic upgrade head

# Revenir à la migration précédente
sudo docker-compose exec backend alembic downgrade -1
```

### Scripts de données initiales (seed)

```bash
sudo docker-compose exec backend python scripts/seed_user.py
sudo docker-compose exec backend python scripts/seed_dictionary.py
sudo docker-compose exec backend python scripts/seed_articles.py
sudo docker-compose exec backend python scripts/seed_events.py
sudo docker-compose exec backend python scripts/seed_library.py
sudo docker-compose exec backend python scripts/seed_sayings.py
```

---

## Structure du projet

```
.
├── backend/        API FastAPI, modèles, schémas, migrations Alembic, tests
├── frontend/       SPA React/TypeScript (Vite)
├── docs/           Cahiers des charges fonctionnel et technique, plan de travail
├── infra/          Configuration infrastructure et déploiement (production)
├── docker-compose.yml
└── .env.example
```

---

## Suivi des phases

| Phase | Description | Statut |
|---|---|---|
| 1 | Structure monorepo (.gitignore, docker-compose.yml, .env.example) | ✅ |
| 2 | Backend FastAPI (healthcheck, JWT, bcrypt) | ✅ |
| 3 | Frontend React/TypeScript (Vite, charte graphique) | ✅ |
| 4 | Base de données (Alembic, modèles complets) | ✅ |
| 5 | docker-compose complet + sécurité cookies | ✅ |
| 6 | CI/CD GitHub Actions | ⬜ |

---

## Auteurs et licence

Projet interne — usage non commercial.
Contenu et développement : équipe Provençal.ia.
Domaine : `le-provencal.ovh`.

Pour toute question, contacter l'administrateur système du projet.
