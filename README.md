# Provencal.ia

Portail culturel dédié à la langue provençale : ressources linguistiques, patrimoine et communauté.

## Suivi des phases

| Phase | Description | Statut |
|---|---|---|
| 1 | Structure monorepo (.gitignore, docker-compose.yml, .env.example) | ✅ |
| 2 | Backend FastAPI (healthcheck, JWT, bcrypt) | ⬜ |
| 3 | Frontend React/TypeScript (Vite, charte graphique) | ⬜ |
| 4 | Base de données (Alembic, modèle users) | ⬜ |
| 5 | docker-compose complet + sécurité cookies | ⬜ |
| 6 | CI/CD GitHub Actions | ⬜ |

## Stack technique

- **Frontend :** React 18 (TypeScript)
- **Backend :** FastAPI (Python 3.12)
- **Base de données :** PostgreSQL 16

## Lancer le projet en local

```bash
cp .env.example .env
sudo docker-compose up --build
```
