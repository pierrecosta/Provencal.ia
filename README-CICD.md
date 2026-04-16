# Provencal.ia — Guide de lancement local

## Prérequis

| Outil | Version minimale |
|-------|-----------------|
| Docker | 24+ |
| Docker Compose | v2 (intégré à Docker Desktop) |
| GNU Make | 3.81+ (pré-installé sur Linux/macOS) |

> **Windows** : utiliser WSL2 ou Git Bash.

---

## Démarrage rapide (première fois)

```bash
# 1. Cloner le dépôt
git clone <url-du-repo> && cd Provencal.ia

# 2. Créer le fichier .env
make env
# → Éditer .env si besoin (mot de passe DB, clé JWT…)

# 3. Construire, démarrer, migrer et peupler la base
make reset
```

Après ~2 minutes :

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

---

## Commandes disponibles

Tapez `make help` pour la liste complète :

```
build             Construire les images Docker
clean             Arrêter et supprimer les volumes (⚠ perte de données)
db-shell          Ouvrir un psql dans le conteneur PostgreSQL
down              Arrêter tous les services
env               Créer .env depuis .env.example (si absent)
lint              Lancer le lint frontend (eslint)
logs              Suivre les logs de tous les services
logs-back         Suivre les logs du backend uniquement
logs-front        Suivre les logs du frontend uniquement
migrate           Lancer les migrations Alembic
reset             Repartir de zéro : rebuild + migrate + seed
restart           Redémarrer tous les services
seed              Importer TOUTES les données de seed
seed-articles     Importer les articles
seed-dict         Importer le dictionnaire
seed-events       Importer les événements
seed-library      Importer la bibliothèque
seed-sayings      Importer les dictons
seed-user         Créer un contributeur
test              Lancer tous les tests (backend + frontend)
test-back         Lancer les tests backend (pytest)
test-front        Lancer les tests frontend (vitest)
up                Démarrer tous les services
```

---

## Workflows courants

### Démarrer / arrêter le projet

```bash
make up       # Démarrer
make down     # Arrêter (les données sont conservées)
make restart  # Redémarrer
```

### Voir les logs

```bash
make logs           # Tous les services
make logs-back      # Backend uniquement
make logs-front     # Frontend uniquement
```

### Peupler la base de données

```bash
make seed           # Tout importer (dictionnaire, articles, événements, dictons, bibliothèque)
make seed-dict      # Dictionnaire seul
make seed-articles  # Articles seuls
```

### Créer un utilisateur contributeur

```bash
make seed-user PSEUDO=admin PASSWORD=motdepasse123
```

### Lancer les tests

```bash
make test           # Backend + Frontend
make test-back      # Backend seul (pytest)
make test-front     # Frontend seul (vitest)
```

### Accéder à la base PostgreSQL

```bash
make db-shell
# Exemples SQL :
#   SELECT count(*) FROM dict_entries;
#   \dt           -- lister les tables
#   \dx           -- lister les extensions (pg_trgm)
```

### Repartir de zéro

```bash
make reset    # Supprime les volumes, reconstruit, migre, seed
```

---

## Architecture Docker

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  frontend   │────▶│   backend    │────▶│     db       │
│  Vite:5173  │     │ FastAPI:8000 │     │ Postgres:5432│
└─────────────┘     └──────────────┘     └──────────────┘
                         │
                    docs/sources/
                    (volume monté)
```

- **db** : PostgreSQL 16 avec `pg_trgm`, volume persistant `pgdata`
- **backend** : Python 3.12, FastAPI, Alembic (migrations auto au démarrage via `entrypoint.sh`)
- **frontend** : Node 20, React 19, Vite (hot-reload inclus via volume `./frontend/src`)

### Volumes de développement

| Volume | Cible conteneur | Rôle |
|--------|----------------|------|
| `./backend` | `/app` | Hot-reload Python (uvicorn --reload) |
| `./frontend/src` | `/app/src` | Hot-reload Vite (HMR) |
| `./docs/sources` | `/docs/sources` (ro) | Fichiers CSV/TXT pour les scripts de seed |
| `pgdata` | `/var/lib/postgresql/data` | Persistance des données PostgreSQL |

---

## Variables d'environnement

Fichier `.env` à la racine (copié depuis `.env.example`) :

| Variable | Rôle | Défaut |
|----------|------|--------|
| `POSTGRES_USER` | Utilisateur PostgreSQL | `provencial_user` |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | `changeme` |
| `POSTGRES_DB` | Nom de la base | `provencial_db` |
| `DATABASE_URL` | URL complète SQLAlchemy (asyncpg) | `postgresql+asyncpg://…@db:5432/…` |
| `SECRET_KEY` | Clé de signature JWT | `changeme_generate_…` |
| `ALGORITHM` | Algorithme JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Durée de validité du token (min) | `60` |
| `VITE_API_URL` | URL de l'API vue par le frontend | `http://localhost:8000` |

> **Important** : `DATABASE_URL` utilise `db` comme hostname (réseau Docker interne).

---

## Résolution de problèmes

| Problème | Solution |
|----------|----------|
| `pg_isready` échoue au démarrage | Attendre 10s, la DB initialise le volume. `make logs` pour vérifier |
| Dictionnaire vide sur le frontend | `make seed-dict` |
| Port 5432 déjà utilisé | Arrêter PostgreSQL local : `sudo systemctl stop postgresql` ou `sudo pg_ctlcluster 16 main stop` |
| Port 8000/5173 déjà utilisé | Arrêter le service local ou modifier les ports dans `docker-compose.yml` |
| `FileNotFoundError: src_dict.csv` | Le volume `docs/sources` n'est pas monté → `make down && make up` |
| Backend ne redémarre pas après modif | Vérifier que le volume `./backend:/app` est bien monté |
| `bcrypt` erreur passlib | Vérifier que `bcrypt==3.2.2` est dans `requirements.txt` (pas ≥4.0) |
| Tests backend : "Future attached to different loop" | Utiliser `make test-back` (dans le conteneur Docker) |
