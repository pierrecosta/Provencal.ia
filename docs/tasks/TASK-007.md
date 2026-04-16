# [TASK-007] Script de seed — Créer un utilisateur contributeur

**Feature :** Fondations & Initialisation
**Rôle cible :** Dev Backend
**Priorité :** P1 (important)
**Dépendances :** TASK-003
**Statut :** Terminé

## Objectif

Créer un script Python autonome permettant de créer un utilisateur contributeur en base de données avec un mot de passe hashé bcrypt. Ce script est l'unique moyen de créer des comptes (pas d'endpoint d'inscription public — cahier fonctionnel §2.2).

## Inputs

- `backend/app/core/database.py` (TASK-001) — `engine`, `async_session_maker`
- `backend/app/core/security.py` — `hash_password()`
- `backend/app/models/user.py` (TASK-002) — modèle `User`
- Cahier fonctionnel §2.2 — « Les identifiants (pseudo + mot de passe) sont créés directement en base de données par l'administrateur système »
- Cahier fonctionnel §2.2 — « Nombre maximum : 10 contributeurs »

## Travail attendu

- Créer `backend/scripts/` (répertoire)
- Créer `backend/scripts/seed_user.py` :
  - Script exécutable en standalone : `python -m scripts.seed_user` (depuis `backend/`)
  - Accepte 2 arguments en ligne de commande : `--pseudo` et `--password`
  - Vérifie que le pseudo n'existe pas déjà en base (sinon message d'erreur explicite)
  - Vérifie qu'il n'y a pas déjà 10 utilisateurs en base (sinon message d'erreur)
  - Hash le mot de passe via `hash_password()`
  - Insère le user en base
  - Affiche un message de confirmation : `Utilisateur '<pseudo>' créé avec succès.`
  - Utilise `asyncio.run()` pour exécuter les opérations async
- Créer `backend/scripts/__init__.py` (fichier vide)

## Outputs

- `backend/scripts/__init__.py`
- `backend/scripts/seed_user.py`

## Tests automatisés à écrire

- Pas de test automatisé pour ce script (script de maintenance, exécution manuelle uniquement)

## Tests manuels (vérification)

- `docker-compose up db` → attendre que PostgreSQL soit prêt
- `alembic upgrade head` (si pas déjà fait)
- `cd backend && python -m scripts.seed_user --pseudo admin --password admin123`
  - → `Utilisateur 'admin' créé avec succès.`
- Relancer la même commande → message d'erreur « Le pseudo 'admin' existe déjà »
- Vérifier en BDD : `SELECT pseudo, password_hash FROM users;` → le hash commence par `$2b$`
- Tester le login : `POST /api/v1/auth/login` avec `{"pseudo": "admin", "password": "admin123"}` → 200 + token

## Critères de "Done"

- [x] `backend/scripts/seed_user.py` existe et est exécutable
- [x] Crée un user avec mot de passe hashé bcrypt
- [x] Refuse les doublons de pseudo
- [x] Refuse si 10 users déjà en base
- [x] Le user créé peut se connecter via `POST /api/v1/auth/login`
