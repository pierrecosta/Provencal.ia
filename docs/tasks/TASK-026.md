# [TASK-026] Backend — Upload d'images (fichier statique)

**Feature :** Socle transversal — Backend
**Rôle cible :** Dev Backend
**Priorité :** P1 (important)
**Dépendances :** TASK-005
**Statut :** Terminé

## Objectif

Implémenter le mécanisme d'upload de fichiers image (modules Bibliothèque et Articles). En développement, les images sont stockées dans `backend/static/images/` et servies par FastAPI. Le champ `image_ref` en base contient soit un chemin local (`/static/images/xxx.jpg`) soit une URL web (`https://...`).

## Inputs

- Cahier fonctionnel §9.2 — 1 image max par entrée, 2 Mo max, compression côté client
- Cahier fonctionnel §7.5 — deux modes : upload fichier (prioritaire) ou saisie URL
- Cahier technique §8.2 — dev : filesystem `backend/static/images/`, prod : S3
- `backend/requirements.txt` — `python-multipart==0.0.12` déjà listé (parsing multipart/form-data)

## Travail attendu

### Endpoint d'upload
- Créer `backend/app/api/upload.py` avec un routeur FastAPI (`prefix="/upload"`, `tags=["Upload"]`) :
  - `POST /upload/image` (auth requise) :
    - Accepte `multipart/form-data` avec un champ `file` (UploadFile)
    - Validations :
      - Type MIME accepté : `image/jpeg`, `image/png`, `image/webp`, `image/gif`
      - Taille max : 2 Mo (vérification côté serveur en plus du client)
    - Génère un nom de fichier unique (UUID + extension originale) pour éviter les collisions
    - Sauvegarde dans `backend/static/images/`
    - Retourne `{ "image_ref": "/static/images/<nom_fichier>" }`
    - Erreur 400 si type MIME invalide ou fichier trop gros

### Servir les fichiers statiques
- Configurer FastAPI pour servir le répertoire `backend/static/` :
  - `app.mount("/static", StaticFiles(directory="static"), name="static")`
  - À ajouter dans `app/main.py`
- Créer le répertoire `backend/static/images/` avec un `.gitkeep`

### Sécurité
- Vérifier le type MIME réel du fichier (pas seulement l'extension)
- Limiter les extensions autorisées : `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`
- Ne pas conserver le nom de fichier original (utiliser UUID)

## Outputs

- `backend/app/api/upload.py`
- `backend/app/main.py` modifié (mount static + routeur upload)
- `backend/static/images/.gitkeep`

## Tests automatisés à écrire

- `backend/tests/test_upload.py` :
  - `test_upload_without_auth` : POST sans token → 401
  - `test_upload_invalid_type` : fichier `.txt` → 400
  - `test_upload_success` : fichier JPEG valide → 200 + `image_ref` retourné
  - `test_upload_too_large` : fichier > 2 Mo → 400
  - `test_static_serving` : GET `/static/images/<fichier>` → fichier servi

## Tests manuels (vérification)

- Upload via Swagger UI → fichier sauvegardé dans `backend/static/images/`
- Accès via `http://localhost:8000/static/images/<nom>` → image affichée
- Upload de fichier non-image → erreur 400

## Critères de "Done"

- [x] L'endpoint `POST /upload/image` accepte et sauvegarde les images
- [x] Le type MIME est validé côté serveur
- [x] La taille est limitée à 2 Mo
- [x] Le nom de fichier est un UUID (pas le nom original)
- [x] FastAPI sert les fichiers statiques sur `/static/`
- [x] Le répertoire `backend/static/images/` est créé
- [x] Les tests passent
