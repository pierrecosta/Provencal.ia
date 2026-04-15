# [TASK-036] Frontend — Mode contributeur Articles (édition inline)

**Feature :** Actualités — Frontend
**Rôle cible :** Dev Frontend
**Priorité :** P1 (important)
**Dépendances :** TASK-017, TASK-025, TASK-026, TASK-034
**Statut :** À faire

## Objectif

Ajouter les boutons d'action contributeur sur la page Articles, avec support de l'upload d'image (compression client + upload API), sélection de catégorie parmi les 20 valeurs, et édition du corps en Markdown.

## Inputs

- `frontend/src/pages/ArticlesPage.tsx` (TASK-025) — page Articles
- `frontend/src/components/ui/Snackbar.tsx`, `ConfirmModal.tsx` (TASK-017)
- `backend/app/api/articles.py` (TASK-024) — endpoints POST, PUT, DELETE, rollback
- `backend/app/api/upload.py` (TASK-026) — `POST /upload/image`
- Cahier fonctionnel §7.5 — image : upload fichier prioritaire sur URL, compression client 2 Mo max
- Cahier fonctionnel §10.1 — les 20 catégories d'articles

## Travail attendu

### Formulaire de création/édition d'article
- Champs :
  - Titre (input, obligatoire, max 200)
  - Description / chapeau (textarea, optionnel, max 300)
  - Corps de l'article (textarea Markdown, optionnel)
  - Image : deux modes
    1. Upload fichier : `<input type="file" accept="image/*">`. Compression côté client (Canvas API) à 2 Mo max avant envoi. Si fichier sélectionné, champ URL grisé.
    2. Saisie URL : input texte `https://...`. Activé uniquement si pas de fichier uploadé.
  - URL source (input, optionnel)
  - Date de publication (input date, obligatoire)
  - Auteur (input, optionnel, max 100)
  - Catégorie (select parmi les 20 valeurs, optionnel)

### Upload d'image
- Créer `frontend/src/utils/imageCompression.ts` :
  - Fonction `compressImage(file: File, maxSizeMB: number): Promise<File>` :
    - Utilise Canvas API pour redimensionner si nécessaire
    - Retourne un fichier ≤ maxSizeMB
- Workflow upload :
  1. Utilisateur sélectionne un fichier
  2. Compression côté client
  3. Upload via `POST /api/v1/upload/image`
  4. Récupérer `image_ref` retourné
  5. Sauvegarder l'article avec cet `image_ref`

### Boutons contributeur
- Mêmes patterns que TASK-017 et TASK-035 : Ajouter, Modifier, Valider, Supprimer, Rollback, Annuler

## Outputs

- `frontend/src/pages/ArticlesPage.tsx` modifié
- `frontend/src/utils/imageCompression.ts`

## Tests automatisés à écrire

- Pas de tests unitaires frontend

## Tests manuels (vérification)

- Ajouter un article avec image uploadée → image compressée, uploadée, affichée
- Ajouter un article avec URL image → image affichée depuis l'URL
- Sélectionner une catégorie parmi les 20 → sauvegardée
- Modifier → rollback → valeurs restaurées
- Supprimer → confirmation → suppression

## Critères de "Done"

- [ ] Formulaire d'article avec tous les champs
- [ ] Upload d'image avec compression client (≤ 2 Mo)
- [ ] Upload prioritaire sur URL (champ URL grisé si fichier sélectionné)
- [ ] Catégorie sélectionnable parmi les 20 valeurs
- [ ] Rollback fonctionnel
- [ ] Snackbar succès/erreur
