# Cahier des Charges Technique — Portail Culturel Provençal

**Date :** 14/04/2026
**Version :** 2.0
**Statut :** Validé pour développement
**Confidentialité :** Usage interne
**Cible :** Équipes Dev & Ops

> Ce document est la **référence unique** pour toutes les contraintes et choix techniques de l'application Provençal.ia : stack, environnement, architecture, sécurité, modèle de données, API, infrastructure, charte graphique d'implémentation et conventions de développement. Pour les contraintes fonctionnelles et utilisateurs, se reporter au [cahier-des-charges-fonctionnel.md](cahier-des-charges-fonctionnel.md).

---

## Table des matières

1. [Stack technique](#1-stack-technique)
2. [Environnement de développement](#2-environnement-de-développement)
3. [Architecture applicative](#3-architecture-applicative)
4. [Sécurité](#4-sécurité)
5. [Base de données — Modèle de données](#5-base-de-données--modèle-de-données)
6. [API REST — Endpoints](#6-api-rest--endpoints)
7. [Import du dictionnaire — Spécifications techniques](#7-import-du-dictionnaire--spécifications-techniques)
8. [Infrastructure & Production (Ops)](#8-infrastructure--production-ops)
9. [Charte graphique — Implémentation CSS](#9-charte-graphique--implémentation-css)
10. [Icônes et assets graphiques](#10-icônes-et-assets-graphiques)
11. [Composants UI — Spécifications techniques](#11-composants-ui--spécifications-techniques)
12. [Données de test et fichiers sources](#12-données-de-test-et-fichiers-sources)
13. [Documentation API (Swagger)](#13-documentation-api-swagger)
14. [Décisions architecturales tranchées](#14-décisions-architecturales-tranchées)
15. [CI/CD et tests](#15-cicd-et-tests)

---

## 1. Stack technique

### 1.1 Langages et frameworks

| Couche | Technologie | Version | Rôle |
|--------|-------------|---------|------|
| **Frontend** | React + TypeScript | React 18 | SPA — interface utilisateur |
| **Build frontend** | Vite | — | Bundler et dev server |
| **Backend** | FastAPI (Python) | 0.115.0 | API REST |
| **Serveur ASGI** | Uvicorn | 0.30.6 | Serveur HTTP asynchrone |
| **Base de données** | PostgreSQL | 16 | Stockage relationnel |
| **ORM** | SQLAlchemy (async) | 2.0.36 | Accès BDD asynchrone |
| **Driver PostgreSQL** | asyncpg | 0.30.0 | Pilote async natif |
| **Migrations** | Alembic | 1.14.0 | Versionnement du schéma BDD |

### 1.2 Dépendances backend

Fichier `backend/requirements.txt` :

| Paquet | Version | Rôle |
|--------|---------|------|
| `fastapi` | 0.115.0 | Framework API |
| `uvicorn[standard]` | 0.30.6 | Serveur ASGI |
| `sqlalchemy[asyncio]` | 2.0.36 | ORM async |
| `asyncpg` | 0.30.0 | Driver PostgreSQL async |
| `alembic` | 1.14.0 | Migrations BDD |
| `python-jose[cryptography]` | 3.3.0 | Gestion JWT (encode/decode) |
| `passlib[bcrypt]` | 1.7.4 | Hashage de mots de passe |
| `python-multipart` | 0.0.12 | Parsing multipart/form-data (upload fichiers) |
| `pydantic` | 2.12.5 | Validation de données |
| `pydantic-settings` | 2.13.1 | Configuration par variables d'environnement |
| `pytest` | 8.3.3 | Framework de tests |
| `httpx` | 0.27.2 | Client HTTP async (tests) |
| `pytest-asyncio` | 0.24.0 | Support async dans pytest |

### 1.3 Conteneurisation

| Outil | Version | Usage |
|-------|---------|-------|
| Docker | 29.1.3 | Conteneurisation |
| docker-compose | 1.29.2 | Orchestration locale multi-conteneurs |

---

## 2. Environnement de développement

### 2.1 Machine de développement

| Composant | Valeur |
|-----------|--------|
| **OS** | Ubuntu 24.04 LTS (WSL2 sur Windows) |
| **Node.js** | 20.20.2 |
| **Python** | 3.12.3 |
| **PostgreSQL natif** | 16.13 (service système, disponible hors conteneur) |
| **Kubernetes** | K8s Canonical v1.32.11 (via snap — commande `k8s`, pas `kubectl`) |

### 2.2 Points d'attention environnement

- **Groupe Docker :** L'utilisateur `picosta` est dans le groupe `docker`. La prise d'effet nécessite une reconnexion de session WSL (`newgrp docker` en attendant). En fallback, préfixer les commandes Docker avec `sudo`.
- **kubectl :** Non disponible directement. Utiliser `k8s kubectl` (ou `sudo k8s kubectl`).
- **HTTPS local :** Non requis en développement. HTTPS uniquement en production (Let's Encrypt).
- **PostgreSQL :** En développement, PostgreSQL tourne en conteneur Docker (pas le service natif) pour isoler l'environnement.

### 2.3 Docker Compose (développement local)

Fichier `docker-compose.yml` — 3 services :

```yaml
services:
  db:         # PostgreSQL 16
    image: postgres:16
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]

  backend:    # FastAPI
    build: ./backend
    ports: ["8000:8000"]
    depends_on: [db]

  frontend:   # React/Vite
    build: ./frontend
    ports: ["5173:5173"]
    depends_on: [backend]
```

Tous les services utilisent `env_file: .env` et `restart: unless-stopped`.

**Lancement :**
```bash
cp .env.example .env
sudo docker-compose up --build
```

### 2.4 Ports locaux

| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite) | 5173 | `http://localhost:5173` |
| Backend (FastAPI) | 8000 | `http://localhost:8000` |
| PostgreSQL | 5432 | `postgresql://user:password@localhost:5432/db` |

### 2.5 Stratégie de développement

- **Phase 1 (en cours) :** Stack lancée via docker-compose (Front + Back + BDD en conteneurs). Pas de K8s en local (overhead inutile pour un développeur solo).
- **Phase 2 (production) :** Déploiement sur cluster Kubernetes, CI/CD via GitHub Actions, SSL Let's Encrypt automatique.

---

## 3. Architecture applicative

### 3.1 Structure du monorepo

```
Provencal.ia/
├── docker-compose.yml        # Orchestration locale
├── .env.example              # Template variables d'environnement
├── README.md
├── backend/
│   ├── Dockerfile            # Image Python 3.12-slim
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py           # Point d'entrée FastAPI
│   │   └── core/
│   │       ├── __init__.py
│   │       ├── config.py     # Settings Pydantic (env vars)
│   │       └── security.py   # JWT + bcrypt
│   └── tests/
│       ├── __init__.py
│       └── test_health.py
├── frontend/                 # React/TypeScript (Vite)
├── infra/                    # Configurations K8s/prod (futur)
└── docs/
    ├── cahier-des-charges-fonctionnel.md
    ├── cahier-des-charges-technique.md   # Ce document
    ├── plan-de-travail-equipes.md
    └── sources/              # Données de seed et assets
        ├── src_dict.csv
        ├── db_schema_init.sql
        ├── sayings_init.txt
        ├── articles_init.txt
        ├── histoire_init.txt
        ├── agenda_init.txt
        ├── transform_dict.py
        └── icons/            # SVG du portail
```

### 3.2 Configuration backend

Configuration centralisée via Pydantic Settings (`app/core/config.py`) :

| Variable d'environnement | Type | Défaut | Description |
|---------------------------|------|--------|-------------|
| `DATABASE_URL` | str | `postgresql+asyncpg://user:password@localhost:5432/db` | URL de connexion PostgreSQL (driver asyncpg) |
| `SECRET_KEY` | str | `changeme_generate_a_long_random_key` | Clé de signature JWT (à remplacer en production) |
| `ALGORITHM` | str | `HS256` | Algorithme JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | int | `60` | Durée de validité du token JWT (minutes) |
| `ENVIRONMENT` | str | `development` | Environnement courant (`development` / `production`) |

Les variables sont lues depuis le fichier `.env` (format dotenv, encodage UTF-8).

### 3.3 Dockerfile backend

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

> `--reload` est actif pour le développement. En production, retirer ce flag et utiliser `--workers N`.

### 3.4 CORS

Middleware CORS configuré dans `app/main.py` :

| Paramètre | Valeur (dev) |
|-----------|--------------|
| `allow_origins` | `["http://localhost:5173"]` |
| `allow_credentials` | `True` |
| `allow_methods` | `["*"]` |
| `allow_headers` | `["*"]` |

> En production, restreindre `allow_origins` au domaine `https://le-provencal.ovh`.

---

## 4. Sécurité

### 4.1 Authentification

| Aspect | Choix technique |
|--------|----------------|
| **Méthode** | JWT Bearer token |
| **Hashage mot de passe** | bcrypt (via `passlib`) |
| **Algorithme JWT** | HS256 |
| **Durée du token** | 60 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`) |
| **Invalidation** | Blacklist côté serveur (`POST /auth/logout`) |
| **Création de compte** | En base directement (pas d'endpoint d'inscription) |
| **Identifiants** | Pseudo + mot de passe uniquement (pas d'email, pas de SSO) |

**Implémentation** (`app/core/security.py`) :
- `hash_password(password)` → hash bcrypt
- `verify_password(plain, hashed)` → vérification bcrypt
- `create_access_token(data, expires_delta)` → JWT signé HS256
- `decode_access_token(token)` → décodage + vérification expiration

### 4.2 Protection CSRF

Cookies avec les attributs :
- `SameSite=Strict` — empêche l'envoi cross-site
- `HttpOnly` — inaccessible au JavaScript client
- `Secure` — envoi uniquement sur HTTPS (**production uniquement**, ignoré en dev HTTP)

Cette combinaison remplace un token CSRF explicite.

### 4.3 RGPD

Pas de collecte de données personnelles identifiables. Les comptes contributeurs n'utilisent qu'un pseudo et un mot de passe hashé, sans lien vers une identité réelle. Le RGPD n'est pas applicable.

### 4.4 SSL/TLS

| Environnement | Mécanisme |
|---------------|-----------|
| **Développement** | Certificat auto-signé local (via `mkcert` ou `openssl`) pour tester les cookies `Secure`. Non requis pour les tests CI. |
| **Production** | Let's Encrypt automatique via Certbot ou Ingress Controller K8s |

---

## 5. Base de données — Modèle de données

### 5.1 PostgreSQL — Version et extensions

- **Version :** PostgreSQL 16 (image Docker `postgres:16`)
- **Extension requise :** `pg_trgm` — recherche approximative par trigrammes (distance de Levenshtein)

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 5.2 Schéma relationnel

Le script SQL complet est dans `docs/sources/db_schema_init.sql`.

#### Table `users`

```sql
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    pseudo        VARCHAR(50)  UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    DEFAULT now()
);
```

#### Table `dict_entries` — Mots français

```sql
CREATE TABLE dict_entries (
    id          SERIAL PRIMARY KEY,
    mot_fr      VARCHAR(200) NOT NULL,
    synonyme_fr VARCHAR(200),
    description TEXT,
    theme       VARCHAR(100),
    categorie   VARCHAR(100),
    locked_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    locked_at   TIMESTAMP,
    created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_dict_entries_mot_fr_trgm
    ON dict_entries USING gin (mot_fr gin_trgm_ops);
```

#### Table `dict_translations` — Traductions provençales

```sql
CREATE TABLE dict_translations (
    id           SERIAL PRIMARY KEY,
    entry_id     INTEGER NOT NULL REFERENCES dict_entries(id) ON DELETE CASCADE,
    graphie      VARCHAR(50),   -- 'mistralienne' | 'classique_ieo' | 'pre_mistralienne' | 'regionale'
    source       VARCHAR(20),   -- 'TradEG' | 'TradD' | 'TradA' | 'TradH' | 'TradAv' | 'TradP' | 'TradX'
    traduction   VARCHAR(500) NOT NULL,
    region       VARCHAR(50),
    locked_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    locked_at    TIMESTAMP,
    created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_dict_translations_trgm
    ON dict_translations USING gin (traduction gin_trgm_ops);
```

#### Table `agenda_events`

```sql
CREATE TABLE agenda_events (
    id           SERIAL PRIMARY KEY,
    titre        VARCHAR(200) NOT NULL,
    date_debut   DATE NOT NULL,
    date_fin     DATE NOT NULL,
    lieu         VARCHAR(200),
    description  VARCHAR(1000),
    lien_externe VARCHAR(500),
    locked_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    locked_at    TIMESTAMP,
    created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMP DEFAULT now(),
    CONSTRAINT chk_dates CHECK (date_fin >= date_debut)
);
```

#### Table `library_entries` — Histoires & Légendes

```sql
CREATE TABLE library_entries (
    id                 SERIAL PRIMARY KEY,
    titre              VARCHAR(200) NOT NULL,
    typologie          VARCHAR(20) CHECK (typologie IN ('Histoire', 'Légende')),
    periode            VARCHAR(200),
    description_courte VARCHAR(200),
    description_longue TEXT,           -- Markdown
    source_url         VARCHAR(500),
    image_ref          VARCHAR(500),   -- chemin local /static/images/ OU URL web https://...
    lang               CHAR(2) DEFAULT 'fr',
    traduction_id      INTEGER REFERENCES library_entries(id) ON DELETE SET NULL,
    locked_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
    locked_at          TIMESTAMP,
    created_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at         TIMESTAMP DEFAULT now()
);
```

#### Table `articles`

```sql
CREATE TABLE articles (
    id               SERIAL PRIMARY KEY,
    titre            VARCHAR(200) NOT NULL,
    description      VARCHAR(300),
    image_ref        VARCHAR(500),    -- chemin local OU URL web
    source_url       VARCHAR(500),
    date_publication DATE NOT NULL,
    auteur           VARCHAR(100),
    categorie        VARCHAR(100) CHECK (categorie IN (
        'Langue & Culture', 'Littérature', 'Poésie', 'Histoire & Mémoire',
        'Traditions & Fêtes', 'Musique', 'Danse', 'Gastronomie', 'Artisanat',
        'Patrimoine bâti', 'Environnement', 'Personnalités', 'Associations',
        'Enseignement', 'Économie locale', 'Numismatique & Archives',
        'Immigration & Diaspora', 'Jeunesse',
        'Régionalisme & Politique linguistique', 'Divers'
    )),
    locked_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
    locked_at        TIMESTAMP,
    created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMP DEFAULT now()
);
```

#### Table `sayings` — Dictons, Expressions, Proverbes

```sql
CREATE TABLE sayings (
    id                 SERIAL PRIMARY KEY,
    terme_provencal    TEXT NOT NULL,
    localite_origine   VARCHAR(200) NOT NULL,
    traduction_sens_fr TEXT NOT NULL,
    type               VARCHAR(30) CHECK (type IN ('Dicton', 'Expression', 'Proverbe')),
    contexte           TEXT,
    source             VARCHAR(300),
    locked_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
    locked_at          TIMESTAMP,
    created_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at         TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_sayings_terme_trgm
    ON sayings USING gin (terme_provencal gin_trgm_ops);
```

#### Table `edit_log` — Journal de rollback

```sql
CREATE TABLE edit_log (
    id          SERIAL PRIMARY KEY,
    table_name  VARCHAR(50) NOT NULL,
    row_id      INTEGER NOT NULL,
    action      VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data    JSONB,
    new_data    JSONB,
    done_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    done_at     TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_edit_log_table_row
    ON edit_log (table_name, row_id, done_at DESC);
```

#### Table `a_propos_content` — Blocs éditables de la page « À propos »

```sql
CREATE TABLE a_propos_content (
    id          SERIAL PRIMARY KEY,
    bloc        VARCHAR(20) NOT NULL UNIQUE CHECK (bloc IN ('demarche', 'sources')),
    contenu     TEXT NOT NULL DEFAULT '',
    locked_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    locked_at   TIMESTAMP,
    updated_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at  TIMESTAMP DEFAULT now()
);
```

> Les deux lignes (`demarche` et `sources`) sont insérées au déploiement initial. Il n'existe pas d'opération de création ou de suppression sur cette table.

### 5.3 Conventions transversales

#### Verrouillage d'édition

Les champs `locked_by` (FK → `users.id`) et `locked_at` (TIMESTAMP) sont présents sur **toutes les tables éditorielles** : `dict_entries`, `dict_translations`, `agenda_events`, `library_entries`, `articles`, `sayings`, `a_propos_content`.

**Logique de verrouillage :**
- Verrou actif si `locked_at + 30min > now()`
- Verrou expiré (ignoré) si `locked_at + 30min ≤ now()`
- `ON DELETE SET NULL` sur la FK `locked_by` → si le contributeur est supprimé, le verrou est libéré
- Le verrou est levé à la sauvegarde (`PUT`) ou à l'annulation

#### Stockage des images

Le champ `image_ref VARCHAR(500)` (tables `library_entries` et `articles`) stocke :
- **En développement :** Chemin local relatif → `/static/images/<nom_fichier>` (servi par FastAPI via le répertoire `backend/static/images/`)
- **En production :** URL S3 complète → `https://<bucket>.s3.<region>.amazonaws.com/<nom>`

Le frontend distingue le mode de rendu selon le préfixe (`/static/` = local, `https://` = distant).

#### Recherche approximative

Index trigrammes `gin_trgm_ops` sur :
- `dict_entries.mot_fr` — recherche FR approchée
- `dict_translations.traduction` — recherche Provençal → FR (toutes graphies)
- `sayings.terme_provencal` — recherche dans les termes

Ces index permettent la recherche avec distance de Levenshtein (tolérance aux fautes de frappe).

---

## 6. API REST — Endpoints

### 6.1 Conventions

- **Base URL (production) :** `https://le-provencal.ovh/api/v1`
- **Base URL (développement) :** `http://localhost:8000/api/v1`
- **Format :** JSON (`application/json`)
- **Authentification :** Header `Authorization: Bearer <token>`

### 6.2 Codes HTTP standards

| Code | Signification |
|------|---------------|
| `200 OK` | Requête réussie |
| `201 Created` | Ressource créée |
| `400 Bad Request` | Erreur de validation |
| `401 Unauthorized` | Token absent ou invalide |
| `403 Forbidden` | Verrou actif par un autre contributeur |
| `404 Not Found` | Ressource inexistante |
| `409 Conflict` | Doublon détecté |
| `500 Internal Server Error` | Erreur serveur |

### 6.3 Endpoints

#### Authentification

| Méthode | Route | Auth | Description |
|---------|-------|:----:|-------------|
| POST | `/auth/login` | Non | Authentification — retourne `{ access_token, token_type }` |
| POST | `/auth/logout` | Oui | Invalide le token (blacklist côté serveur) |

#### Système

| Méthode | Route | Auth | Description |
|---------|-------|:----:|-------------|
| GET | `/health` | Non | Santé de l'API et de la BDD — retourne `{ status, environment }` |

#### Dictionnaire

| Méthode | Route | Auth | Description |
|---------|-------|:----:|-------------|
| GET | `/dictionary` | Non | Liste paginée + recherche FR→Prov. Params : `?q=<mot>&dir=fr_to_prov&theme=&categorie=&graphie=&source=&page=1&per_page=20`. Suggestions Levenshtein si mot non trouvé. |
| GET | `/dictionary/search` | Non | Recherche Prov→FR (toutes graphies). Params : `?q=<mot>&dir=prov_to_fr` |
| GET | `/dictionary/{id}` | Non | Détail complet d'une entrée : métadonnées + toutes les traductions |
| PUT | `/dictionary/{id}` | Oui | Modifier une entrée (métadonnées + traductions). Vérifie le verrou sur `dict_entries`. Le corps contient les champs de `dict_entries` et un tableau `translations` remplaant l'intégralité des lignes `dict_translations` existantes. |
| DELETE | `/dictionary/{id}` | Oui | Supprimer une entrée et ses traductions (`CASCADE`) |
| POST | `/dictionary/import` | Oui | Import CSV/Excel — `multipart/form-data` (voir §7) |

#### Dictons / Expressions / Proverbes

| Méthode | Route | Auth | Description |
|---------|-------|:----:|-------------|
| GET | `/sayings/today` | Non | Terme du jour — sélection déterministe 24h (`CURRENT_DATE % COUNT(*)`) |
| GET | `/sayings` | Non | Liste paginée. Params : `?type=Dicton|Expression|Proverbe&localite=&page=1&per_page=20` |
| POST | `/sayings` | Oui | Créer un terme |
| PUT | `/sayings/{id}` | Oui | Modifier un terme (vérifie le verrou) |
| DELETE | `/sayings/{id}` | Oui | Supprimer un terme |

#### Agenda

| Méthode | Route | Auth | Description |
|---------|-------|:----:|-------------|
| GET | `/events` | Non | Événements à venir (chronologique). Params : `?archive=true` pour les archives, `?lieu=&annee=&mois=` |
| POST | `/events` | Oui | Créer un événement |
| PUT | `/events/{id}` | Oui | Modifier (vérifie le verrou) |
| DELETE | `/events/{id}` | Oui | Supprimer |

#### Bibliothèque

| Méthode | Route | Auth | Description |
|---------|-------|:----:|-------------|
| GET | `/library` | Non | Liste. Params : `?type=Histoire|Légende&periode=&lieu=&page=1&per_page=20` |
| GET | `/library/{id}` | Non | Détail d'une entrée |
| POST | `/library` | Oui | Créer une entrée |
| PUT | `/library/{id}` | Oui | Modifier (vérifie `locked_by`) |
| DELETE | `/library/{id}` | Oui | Supprimer |

#### Articles

| Méthode | Route | Auth | Description |
|---------|-------|:----:|-------------|
| GET | `/articles` | Non | Liste triée par `date_publication` desc. Params : `?categorie=&annee=&mois=` |
| POST | `/articles` | Oui | Créer un article |
| PUT | `/articles/{id}` | Oui | Modifier |
| DELETE | `/articles/{id}` | Oui | Supprimer |

#### Traducteur

| Méthode | Route | Auth | Description |
|---------|-------|:----:|-------------|
| POST | `/translate` | Non | Traduction lexicale mot-à-mot. Body : `{ text: "..." }`. Retourne `{ translated: "...", unknown_words: [...] }` |

#### Page « À propos »

| Méthode | Route | Auth | Description |
|---------|-------|:----:|-------------|
| GET | `/a-propos` | Non | Retourne les deux blocs éditables (`demarche`, `sources`) et la liste des pseudos contributeurs actifs (depuis `users`). Format : `{ demarche: { contenu, locked_by, locked_at }, sources: { contenu, locked_by, locked_at }, contributors: ["pseudo", ...] }` |
| PUT | `/a-propos/{bloc}` | Oui | Modifier le contenu d'un bloc (`demarche` ou `sources`). Vérifie le verrou. Body : `{ contenu: "..." }` |
| POST | `/a-propos/{bloc}/lock` | Oui | Acquérir le verrou sur un bloc avant édition |
| DELETE | `/a-propos/{bloc}/lock` | Oui | Libérer le verrou (annulation ou sauvegarde) |

---

## 7. Import du dictionnaire — Spécifications techniques

### 7.1 Endpoint

```
POST /api/v1/dictionary/import
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body: { file: <fichier CSV ou XLSX> }
```

### 7.2 Format du fichier

- **Types acceptés :** `.csv` / `.xlsx`
- **Séparateur CSV :** `;` (point-virgule)
- **Encodage :** Détection automatique (BOM ou librairie `chardet`). UTF-8 par défaut. Erreur explicite si non déterminable.
- **Première ligne :** En-tête obligatoire (noms de colonnes)
- **Colonnes :** 13 exactement — toute ligne avec un nombre différent stoppe l'import

### 7.3 Structure des 13 colonnes

| N° | Nom de colonne | Obligatoire | Max | Description |
|----|---------------|:-----------:|-----|-------------|
| 1 | `Thème` | Oui | 100 | Thème principal (Nature, Animaux, Cuisine…) |
| 2 | `Catégorie` | Oui | 100 | Sous-catégorie du thème |
| 3 | `Mot français` | Oui | 200 | Entrée principale en français |
| 4 | `Synonyme français` | Non | 200 | Variantes françaises |
| 5 | `Description` | Non | texte libre | Contexte, notes d'usage, étymologie |
| 6 | `Traduction` | Non* | 500 | Traductions provençales canoniques (toutes graphies) |
| 7 | `TradEG` | Non | 500 | Trad. Étienne Garcin (1823, Grasse/Var) |
| 8 | `TradD` | Non | 500 | Trad. Autran (XIXe s., Alpes-Maritimes) |
| 9 | `TradA` | Non | 500 | Trad. Achard (1785, Alpes-Maritimes) |
| 10 | `TradH` | Non | 500 | Trad. Honnorat (1846, Var/Basses-Alpes) |
| 11 | `TradAv` | Non | 500 | Trad. Avril (1834, Marseille) |
| 12 | `TradP` | Non | 500 | Trad. Abbé Pellas (1723, Marseille) |
| 13 | `TradX` | Non | 500 | Trad. Xavier de Fourvières (1901, Vallée du Rhône) |

> \* Au moins une des colonnes 6 à 13 doit être non vide pour qu'une ligne soit importée.

### 7.4 Sources lexicographiques — Correspondance code ↔ auteur

| Code | Auteur | Ouvrage | Année | Zone |
|------|--------|---------|-------|------|
| `TradEG` | Étienne Garcin | *Dictionnaire provençal-français* | 1823 | Grasse, Var |
| `TradD` | Autran | *(Glossaire manuscrit)* | XIXe s. | Alpes-Maritimes |
| `TradA` | Claude-François Achard | *Dict. de la Provence et du Comté Venaissin* | 1785 | Alpes-Maritimes |
| `TradH` | Simon-Jude Honnorat | *Dict. provençal-français* (4 vol.) | 1846–1848 | Var, Basses-Alpes |
| `TradAv` | Avril | *Dictionnaire provençal-français* | 1834 | Marseille |
| `TradP` | Abbé Pierre Pellas | *Dict. provençal et français* | 1723 | Marseille |
| `TradX` | Xavier de Fourvières | *Lou Pichot Trésor* | 1901 | Vallée du Rhône |

### 7.5 Thèmes reconnus (13 valeurs)

`Nature` · `Animaux` · `Cuisine` · `Armée` · `Quotidien` · `Travail` · `Divers` · `Corps Humain Et Sante` · `Maison Et Habitat` · `Famille Et Relations` · `Religion Et Croyances` · `Geographie Et Territoire` · `Langue Et Grammaire`

### 7.6 Réponses de l'endpoint

| Code | Cas | Body |
|------|-----|------|
| `200` | Succès | `{ "imported": N, "skipped": 0 }` |
| `400` | Erreur format | `{ "error": "Ligne 42 : 11 colonnes trouvées, 13 attendues" }` |
| `400` | Encodage invalide | `{ "error": "Encodage non supporté. Convertir en UTF-8." }` |
| `401` | Token invalide | `{ "detail": "Not authenticated" }` |
| `409` | Doublon | `{ "error": "Ligne 15 : doublon (mot_fr + thème + catégorie)" }` |

---

## 8. Infrastructure & Production (Ops)

### 8.1 Hébergement production

| Aspect | Choix |
|--------|-------|
| **Orchestration** | Kubernetes (3 pods minimum : Front, Back, BDD) |
| **Provider cloud** | **Non encore choisi** — OVH, Scaleway ou Hetzner en évaluation |
| **Nom de domaine** | `le-provencal.ovh` (réservé) |
| **SSL** | Let's Encrypt automatique (Certbot ou Ingress Controller) |

### 8.2 Stockage des images

| Environnement | Mécanisme | Chemin |
|---------------|-----------|--------|
| **Développement** | Filesystem local | `backend/static/images/` — servi par FastAPI via `/static/images/<nom>` |
| **Production** | Bucket S3-compatible | OVH Object Storage, Scaleway ou AWS S3. `image_ref` contient l'URL S3 complète. |

**Logique frontend :** Le champ `image_ref` accepte indifféremment un chemin local (`/static/images/xxx.jpg`) ou une URL web (`https://...`). Le frontend choisit le mode de rendu selon le préfixe.

### 8.3 Disponibilité et maintenance

| Aspect | Règle |
|--------|-------|
| **Arrêt nocturne** | Pods automatiquement arrêtés de 20h à 8h via CronJob K8s (économie de ressources) |
| **Sauvegardes** | Hebdomadaires — dump du volume PostgreSQL |
| **Logs** | Console Docker (stdout/stderr) |

---

## 9. Charte graphique — Implémentation CSS

### 9.1 Palette de couleurs

**Thème :** « Terre de Provence » — tons chauds et sobres, inspiration franceinfo.

| Variable CSS | Hex | Nom | Rôle |
|-------------|-----|-----|------|
| `--color-bg` | `#F9F7F2` | Blanc cassé « coquille d'œuf » | Fond principal de toutes les pages |
| `--color-text` | `#2D2926` | Charbon de terre | Texte de corps |
| `--color-primary` | `#869121` | Vert olive sourd | Boutons, titres, liens actifs, navigation active, snackbar succès |
| `--color-secondary` | `#D5713F` | Terracotta | Alertes, bandeau agenda, bordure terme du jour, icône suppression, verrou |
| `--color-border` | `#D1CEC7` | Gris doux | Bordures, séparations, contours de cartes |
| `--color-error` | `#B94040` | Rouge modéré | Messages et icônes d'erreur |
| `--color-highlight` | `#FFF9C4` | Jaune pâle | Mots inconnus dans le traducteur |

### 9.2 Échelle typographique

Toutes les tailles en `rem` pour respecter le réglage navigateur (base HTML 100% = 16px).

| Variable CSS | Taille rem | Equiv. px | Utilisation |
|-------------|-----------|-----------|-------------|
| `--text-xs` | 0.75 rem | 12px | Légendes techniques, labels de champs |
| `--text-sm` | 0.875 rem | 14px | Libellés nav mobile |
| `--text-base` | 1.125 rem | **18px** | Corps de texte — **MINIMUM pour seniors** |
| `--text-md` | 1.25 rem | 20px | Chapeau article, description courte |
| `--text-lg` | 1.5 rem | 24px | Titres de carte, sous-titres de section |
| `--text-xl` | 1.875 rem | 30px | Titres de page `<h2>` |
| `--text-2xl` | 2.25 rem | 36px | Terme du jour `<h1>` accueil |
| `--text-3xl` | 2.75 rem | 44px | Titres exceptionnels (usage rare) |

**Graisse :**
- Corps : `font-weight: 400`
- Titres, labels actifs, navigation active : `font-weight: 700`

**Interlignes :**
- Corps : `line-height: 1.7` (aéré pour la lecture senior)
- Titres : `line-height: 1.3`
- Navigation : `line-height: 1.2`

**Polices :**
- Corps et titres : `Inter, system-ui, sans-serif`
- Termes provençaux (affichage culturel) : `Georgia, 'Times New Roman', serif`

### 9.3 Référentiel de spacing (base 8px)

```css
:root {
  /* Unité de base — modifier UNIQUEMENT cette valeur pour rescaler tout le site */
  --space-unit: 8px;

  --space-1:  8px;   /* s : séparation interne de composant (icône/label) */
  --space-2:  16px;  /* m : padding interne de card, espacement entre éléments proches */
  --space-3:  24px;  /* l : espacement entre sections associées */
  --space-4:  32px;  /* xl : marge entre blocs indépendants */
  --space-5:  40px;  /* 2xl : section à section, marges latérales mobile */
  --space-6:  48px;  /* 3xl : espacement majeur (entre modules de page) */
  --space-7:  60px;  /* mobile-nav-h : hauteur barre nav mobile + padding-bottom page */
  --space-8:  64px;  /* navbar-h : hauteur barre nav desktop + padding-top page */

  /* Marges de conteneur principal */
  --container-px-mobile:  16px;   /* --space-2 */
  --container-px-tablet:  32px;   /* --space-4 */
  --container-px-desktop: 48px;   /* --space-6 */
  --container-max-width:  1100px;
  --container-text-max:   720px;  /* max-width colonnes de lecture */

  /* Zones cliquables (WCAG tactile) */
  --touch-target: 44px;

  /* Rayon des coins */
  --radius-sm: 4px;   /* chips, badges */
  --radius-md: 8px;   /* cartes, popovers */
  --radius-lg: 12px;  /* modals, bottom sheet */
}
```

**Règles d'application :**

| Contexte | Espacement |
|----------|------------|
| Padding interne des cartes | `--space-2` (16px) mobile / `--space-3` (24px) desktop |
| Gap entre cartes en liste | `--space-2` (16px) |
| Marge entre `<section>` | `--space-5` (40px) |
| Marge entre `<h2>` et son contenu | `--space-2` (16px) |
| Espacement entre champs de formulaire | `--space-3` (24px) |
| Espacement label-input | `--space-1` (8px) |

### 9.4 Breakpoints responsive

| Nom | Condition | Cible |
|-----|-----------|-------|
| Mobile | `< 768px` | Smartphones 375–430px |
| Desktop | `≥ 768px` | Écrans 15"–22" (1280–1920px) |

Pas de breakpoint tablette distinct dans cette version. Au-delà de 1440px, le layout reste centré avec des marges blanches (`max-width: 1100px`).

---

## 10. Icônes et assets graphiques

Tous les fichiers SVG sont stockés dans `docs/sources/icons/`.

**Conventions SVG :**
- `viewBox="0 0 24 24"`
- `stroke="#869121"` (vert olive) par défaut
- `stroke-width="2"` à `"2.5"` (renforcé pour lisibilité seniors)
- `fill="none"` (style outline)

### 10.1 Logos

| Fichier | Dimensions | Description |
|---------|------------|-------------|
| `logo-option-a.svg` | 120×40 | Cigale + livre (horizontal) |
| `logo-option-b.svg` | 120×40 | Soleil + Croix de Provence (horizontal) |

### 10.2 Icônes de navigation

| Fichier | Usage |
|---------|-------|
| `icon-accueil.svg` | Accueil / Mémoire vivante |
| `icon-articles.svg` | Actualités |
| `icon-langue.svg` | Langue (livre ouvert) |
| `icon-dictionnaire.svg` | Sous-menu Dictionnaire |
| `icon-traducteur.svg` | Sous-menu Traducteur |
| `icon-agenda.svg` | Agenda |
| `icon-culture.svg` | Culture / Bibliothèque |
| `icon-a-propos.svg` | À propos |
| `icon-compte.svg` | Compte |
| `icon-memoire-vivante.svg` | Guillemets + fleur (page accueil) |
| `icon-recherche.svg` | Champ de recherche |
| `icon-image.svg` | Placeholder image absente |

### 10.3 Icônes décoratives thématiques

| Fichier | Usage |
|---------|-------|
| `icon-cigale.svg` | Fin de liste Mémoire vivante |
| `icon-lavande.svg` | Brin de lavande décoratif |
| `icon-olivier.svg` | Fin de liste Bibliothèque |
| `icon-soleil.svg` | Soleil de Provence |

### 10.4 Icônes actions contributeur

| Fichier | Couleur stroke | Usage |
|---------|---------------|-------|
| `icon-ajouter.svg` | `#869121` | Créer (+ dans cercle) |
| `icon-editer.svg` | `#869121` | Mode édition (crayon) |
| `icon-valider.svg` | `#869121` | Enregistrer (✓ dans cercle) |
| `icon-supprimer.svg` | `#D5713F` | Supprimer (corbeille, terracotta) |
| `icon-rollback.svg` | `#869121` | Rollback (flèche arrière courbe) |
| `icon-annuler.svg` | `#2D2926` | Fermer édition (× dans cercle, charbon) |

### 10.5 Icônes authentification

| Fichier | Couleur | Usage |
|---------|---------|-------|
| `icon-connexion.svg` | `#869121` | Se connecter (cadenas ouvert) |
| `icon-deconnexion.svg` | `#869121` | Se déconnecter (cadenas fermé) |
| `icon-verrou.svg` | `#D5713F` | Élément verrouillé par un autre contributeur |

### 10.6 Icônes fonctionnelles — Navigation et pagination

| Fichier | Usage |
|---------|-------|
| `icon-retour.svg` | Bouton Retour (pages de détail) |
| `icon-precedent.svg` | Pagination : page précédente |
| `icon-suivant.svg` | Pagination : page suivante |
| `icon-deplier.svg` | Accordéon : ouvrir (chevron bas) |
| `icon-replier.svg` | Accordéon : fermer (chevron haut) |

### 10.7 Icônes fonctionnelles — Données et filtres

| Fichier | Usage |
|---------|-------|
| `icon-filtre.svg` | Bouton Filtres |
| `icon-date.svg` | Filtre/champ date |
| `icon-localite.svg` | Filtre localité (pin de carte) |
| `icon-archive.svg` | Lien vers les archives |
| `icon-lien-externe.svg` | Lien s'ouvrant dans un nouvel onglet |
| `icon-partager.svg` | Partager une page / un contenu |
| `icon-toggle-langue.svg` | Sélecteur direction FR ↔ OC (dictionnaire) |
| `icon-upload-image.svg` | Upload d'un fichier image |

### 10.8 Icônes d'état et feedback

| Fichier | Couleur | Usage |
|---------|---------|-------|
| `icon-chargement.svg` | `#869121` | Spinner de chargement |
| `icon-alerte.svg` | `#D5713F` | Message d'alerte (triangle !) |
| `icon-succes.svg` | `#869121` | Opération réussie (✓) |
| `icon-erreur.svg` | `#B94040` | Erreur système ou validation (×) |

---

## 11. Composants UI — Spécifications techniques

### 11.1 Barre de navigation — Desktop (≥ 768px)

| Propriété | Valeur |
|-----------|--------|
| Position | `position: fixed; top: 0` |
| Fond | `#F9F7F2` |
| Bordure basse | `1px solid #D1CEC7` |
| Hauteur | `64px` |
| Libellé taille min | 16px |
| Icônes + libellés | Toujours visibles (pas d'icônes seules) |
| Entrée active | `font-weight: 700`, soulignement `2px solid #869121` |
| Entrées inactives | `color: #2D2926`, `opacity: 0.75` au repos, `1.0` au hover/focus |
| Sous-menu Langue | Dropdown au clic ET `:focus-within`. Fermé clic ext. ou `Escape`. Fond `#F9F7F2`, bordure `#D1CEC7`, `box-shadow` légère |
| Contenu principal | `padding-top: 64px` |

### 11.2 Barre de navigation — Mobile (< 768px)

| Propriété | Valeur |
|-----------|--------|
| Position | `position: fixed; bottom: 0` |
| Fond | `#F9F7F2` |
| Bordure haute | `1px solid #D1CEC7`, ombre portée vers le haut |
| Hauteur | `60px` (zones tactiles ≥ 44×44px) |
| Layout | 7 entrées, `flex: 1`, icône centrée au-dessus du libellé |
| Libellé taille min | `11px` |
| Entrée active | `color: #869121`, `font-weight: 700` |
| Entrées inactives | `color: #2D2926`, `opacity: 0.65` |
| Sous-menu Langue | Bottom sheet (`<dialog>` natif ou `role="dialog" aria-modal="true"`), focus piégé |
| Contenu principal | `padding-bottom: 60px` |
| Logo | Absent — titre de page dans un `<header>` séparé en haut du contenu |

### 11.3 Accessibilité navigation (ARIA)

- `aria-current="page"` sur l'entrée active
- Navigation clavier : Tab, Enter, Escape (fermer sous-menu)
- `aria-label` sur chaque entrée de menu
- `scroll-margin-top: 64px` sur les cibles d'ancre (desktop)
- Focus SPA replacé sur `<h1>` après chaque changement de route (WCAG 2.4.3)

### 11.4 Page de connexion

| Propriété | Valeur |
|-----------|--------|
| Layout | Centré vertical + horizontal |
| Carte | `max-width: 400px` |
| Message informatif | `font-size: --text-sm`, `color: #869121` |
| Bouton | Pleine largeur, `background: #869121`, `color: white` |

### 11.5 Terme du jour (accueil)

| Propriété | Valeur |
|-----------|--------|
| Carte | Largeur 100%, fond `#F9F7F2` |
| Bordure | `border: 2px solid #D5713F` (terracotta) |
| Titre | `font-size: --text-2xl` (36px) |

### 11.6 Traducteur — Mots inconnus

| Propriété | Valeur |
|-----------|--------|
| Fond | `#FFF9C4` (jaune pâle) |

### 11.7 Agenda — Page de détail

| Propriété | Valeur |
|-----------|--------|
| Bande dates/lieu | `background: #D5713F`, `color: white` |

### 11.8 Snackbar (notifications)

| Type | Couleur fond | Durée | Position desktop | Position mobile |
|------|-------------|-------|-----------------|----------------|
| Succès | `#869121` | 3s | `bottom: 16px` | `bottom: 76px` (au-dessus nav 60px + 16px marge) |
| Erreur | `#B94040` | 4s | `bottom: 16px` | `bottom: 76px` |

### 11.9 Animations

| Règle | Valeur |
|-------|--------|
| Transitions autorisées | Fade-in discrets uniquement |
| Animations interdites | Mouvements latéraux, zoom, rebonds, parallaxe |
| Respect préférences | Aucune animation si `prefers-reduced-motion: reduce` |

---

## 12. Données de test et fichiers sources

### 12.1 Fichiers de seed

| Fichier | Module | Contenu |
|---------|--------|---------|
| `docs/sources/src_dict.csv` | Dictionnaire | 6 049 entrées réelles FR→Provençal, 13 thèmes, 41 catégories (UTF-8, séparateur `;`) |
| `docs/sources/db_schema_init.sql` | Tous modules | Script SQL `CREATE TABLE` complet (schéma v1.9, `locked_by` sur tous les modules, `image_ref`, index trigram) |
| `docs/sources/sayings_init.txt` | Dictons/Expressions | 30 entrées (10 dictons, 10 expressions, 10 proverbes) |
| `docs/sources/articles_init.txt` | Actualités | 4 articles culturels réalistes |
| `docs/sources/histoire_init.txt` | Bibliothèque | 5 entrées (3 Histoires, 2 Légendes) avec contenu Markdown |
| `docs/sources/agenda_init.txt` | Agenda | 5 événements culturels avec dates et lieux réels |

### 12.2 Fichiers utilitaires

| Fichier | Rôle |
|---------|------|
| `docs/sources/transform_dict.py` | Script de transformation du dictionnaire CSV (nettoyage, normalisation) |

---

## 13. Documentation API (Swagger)

| Environnement | Swagger UI | ReDoc | OpenAPI JSON |
|---|---|---|---|
| Développement | `http://localhost:8000/docs` | `http://localhost:8000/redoc` | `http://localhost:8000/openapi.json` |
| Production | **Désactivé** | **Désactivé** | **Désactivé** |

Désactivation en production contrôlée par la variable `ENVIRONMENT=production` dans `app/core/config.py` :
```python
_is_dev = settings.ENVIRONMENT != "production"
docs_url="/docs" if _is_dev else None
redoc_url="/redoc" if _is_dev else None
openapi_url="/openapi.json" if _is_dev else None
```

---

## 14. Décisions architecturales tranchées

Toutes les décisions ont été prises le 14/04/2026 :

| # | Sujet | Décision | Justification |
|---|-------|----------|---------------|
| 1 | **Environnements** | Docker Compose (dev), Kubernetes (prod) | Simplicité en dev solo, scalabilité en prod |
| 2 | **Nom de domaine** | `le-provencal.ovh` | Réservé, extension locale |
| 3 | **Provider cloud** | Non encore choisi (OVH / Scaleway / Hetzner) | Évaluation en cours |
| 4 | **Graphie site** | Graphie neutre (1 traduction, sans contrôle source) | Simplicité hors dictionnaire |
| 5 | **Graphie dictionnaire** | Mistralienne + Classique IEO à égalité | Neutralité linguistique |
| 6 | **Stockage images** | Filesystem local (dev) → S3 (prod). `image_ref VARCHAR(500)` = chemin local OU URL web | Simplicité dev, scalabilité prod |
| 7 | **Workflow publication** | Publication directe (pas de brouillon) | Équipe de confiance réduite (≤ 10) |
| 8 | **Encodage dict** | Auto-détection (`chardet`), UTF-8 par défaut | Tolérance aux fichiers sources anciens |
| 9 | **SSL dev** | Certificat auto-signé (`mkcert` / `openssl`) | Test cookies `Secure` en local |
| 10 | **Interface admin** | Aucune — gestion des comptes en base directement | Simplicité, pas de surface d'attaque admin |
| 11 | **Driver BDD** | `asyncpg` via `sqlalchemy[asyncio]` | Performance async native |
| 12 | **Recherche approchée** | `pg_trgm` (trigrammes PostgreSQL) | Natif, pas de dépendance externe |

---

## 15. CI/CD et tests

### 15.1 Tests

| Type | Framework | Fichiers | Description |
|------|-----------|----------|-------------|
| Tests unitaires API | pytest + httpx + pytest-asyncio | `backend/tests/` | Vérification des routes API et santé BDD |

**Configuration pytest** (`backend/pytest.ini`) :
- Découverte automatique des fichiers `test_*.py` dans `backend/tests/`

### 15.2 Pipeline CI/CD

| Aspect | Choix |
|--------|-------|
| **Plateforme** | GitHub Actions |
| **Déclencheur** | Push sur `main` + Pull Requests |
| **Étapes** | Lint → Tests unitaires → Build Docker → Push image → Deploy K8s |
| **Tests en CI** | Pas de certificat SSL requis (uniquement en local pour les tests manuels) |

### 15.3 Conventions de développement

| Convention | Règle |
|------------|-------|
| **Structure API** | Préfixe `/api/v1` pour tous les endpoints |
| **Format dates** | ISO 8601 (`YYYY-MM-DD`) |
| **Encoding API** | UTF-8 |
| **Format réponse** | JSON |
| **Pagination** | `?page=1&per_page=20` (défaut : 20) |
| **Tri par défaut** | `created_at DESC` sauf articles (`date_publication DESC`) |
