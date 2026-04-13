# Plan de travail des équipes

## Environnement local (machine de développement)

**OS :** Ubuntu 24.04 LTS (WSL2 sur Windows)

| Outil | Version | Notes |
|---|---|---|
| Node.js | 20.20.2 | Frontend React/TypeScript |
| Python | 3.12.3 | Backend FastAPI |
| PostgreSQL | 16.13 | BDD locale (service natif) |
| Docker | 29.1.3 | Conteneurisation locale |
| docker-compose | 1.29.2 | Orchestration locale multi-conteneurs |
| K8s (Canonical) | v1.32.11 | Via snap — commande `k8s` (pas `kubectl`) |

### Points d'attention environnement

- **Groupe Docker :** `picosta` a été ajouté au groupe `docker`. La prise d'effet nécessite une **reconnexion de la session WSL** (ou `newgrp docker`). En attendant, préfixer les commandes Docker avec `sudo`.
- **kubectl :** Non disponible directement. Passer par `k8s kubectl` (ou `sudo k8s kubectl`).
- **HTTPS local :** Non applicable en développement local. HTTPS uniquement en production (Let's Encrypt).

---

## Stratégie de développement

### Phase 1 — Local (en cours)
- Stack lancée via **docker-compose** (Front + Back + BDD)
- PostgreSQL en conteneur pour isoler l'environnement de développement
- Pas de K8s en local (overhead inutile pour une personne)

### Phase 2 — Production
- Déploiement sur cluster **Kubernetes** (3 pods minimum : Front, Back, BDD)
- CI/CD via GitHub Actions
- SSL Let's Encrypt automatique

---

## Sécurité

### CSRF
Utilisation de cookies avec les attributs `SameSite=Strict`, `Secure` et `HttpOnly`. Cette combinaison garantit que les cookies ne peuvent pas être envoyés dans des requêtes intersites, ce qui protège contre les attaques CSRF.

> Note : `Secure` s'applique uniquement en production (HTTPS). En développement local (HTTP), seul `SameSite=Strict` et `HttpOnly` sont actifs.

### Authentification
JWT + bcrypt. Pas d'interface d'administration : gestion des comptes directement en base de données par l'administrateur système.