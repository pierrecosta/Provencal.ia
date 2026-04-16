# [TASK-038] Frontend — Mode contributeur Dictionnaire (import CSV)

**Feature :** Dictionnaire — Frontend
**Rôle cible :** Dev Frontend
**Priorité :** P1 (important)
**Dépendances :** TASK-017, TASK-031, TASK-030
**Statut :** Terminé

## Objectif

Ajouter la fonctionnalité d'import de fichier dictionnaire (CSV/XLSX) sur la page Dictionnaire, accessible uniquement aux contributeurs authentifiés. L'import utilise l'endpoint `POST /dictionary/import` avec retour d'erreur détaillé (numéro de ligne fautive).

## Inputs

- `frontend/src/pages/DictionnairePage.tsx` (TASK-031) — page Dictionnaire
- `backend/app/api/dictionary.py` (TASK-030) — `POST /api/v1/dictionary/import` (multipart/form-data)
- `frontend/src/context/AuthContext.tsx` (TASK-015) — `isAuthenticated`
- Cahier fonctionnel §3.2 — import réservé aux contributeurs

## Travail attendu

### Bouton d'import
- Visible uniquement si `isAuthenticated`, en haut de la page Dictionnaire
- Bouton « Importer un fichier » avec icône `icon-upload-image.svg`
- Au clic : ouvre un `<input type="file" accept=".csv,.xlsx">`

### Workflow d'import
1. Sélection du fichier
2. Affichage du nom du fichier + bouton « Lancer l'import »
3. Pendant l'import : spinner + message « Import en cours... »
4. Succès : snackbar verte « XX entrées importées »
5. Erreur : snackbar rouge avec le message d'erreur retourné par l'API (numéro de ligne, type d'erreur)

### Gestion des erreurs
- Erreur format (colonnes ≠ 13) : afficher « Ligne XX : YY colonnes trouvées, 13 attendues »
- Doublon : afficher « Ligne XX : doublon (mot + thème + catégorie) »
- Fichier trop volumineux ou type invalide : erreur générique

### Copier icône
- Copier `docs/sources/icons/icon-upload-image.svg` vers `frontend/src/assets/icons/` si pas déjà fait

## Outputs

- `frontend/src/pages/DictionnairePage.tsx` modifié (bouton import + workflow)

## Tests automatisés à écrire

- Pas de tests unitaires frontend

## Tests manuels (vérification)

- Visiteur : bouton d'import invisible
- Contributeur : bouton visible, sélection d'un fichier CSV → import → snackbar succès
- Import d'un fichier avec erreur → message d'erreur avec numéro de ligne
- Import d'un fichier non CSV/XLSX → erreur

## Critères de "Done"

- [x] Bouton d'import visible uniquement si authentifié
- [x] Sélection de fichier CSV ou XLSX
- [x] Import avec spinner de progression
- [x] Succès : snackbar verte avec nombre d'entrées importées
- [x] Erreur : message détaillé avec numéro de ligne
- [x] Le dictionnaire se recharge après l'import
