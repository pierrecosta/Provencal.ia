# [TASK-025] Frontend — Page Articles (liste + détail)

**Feature :** Actualités — Frontend
**Rôle cible :** Dev Frontend
**Priorité :** P1 (important)
**Dépendances :** TASK-014, TASK-018, TASK-024
**Statut :** À faire

## Objectif

Implémenter la page Articles côté frontend : liste journal triée par date décroissante avec filtres par date et catégorie, et page de détail avec image hero, chapeau, corps Markdown, bloc auteur/date/catégorie et lien source.

## Inputs

- `backend/app/api/articles.py` (TASK-024) — endpoints :
  - `GET /api/v1/articles?categorie=&annee=&mois=` → `PaginatedResponse[ArticleResponse]`
- `frontend/src/services/api.ts` (TASK-015) — client HTTP
- `frontend/src/components/ui/Breadcrumb.tsx`, `BackButton.tsx` (TASK-018)
- Cahier fonctionnel §3.6 — articles : titre, auteur, date, chapeau, image, catégorie parmi 20 valeurs
- Cahier fonctionnel §6.6 — page détail : image hero pleine largeur (max 400px), chapeau, corps Markdown, bloc auteur/date/catégorie
- Cahier fonctionnel §10.1 — les 20 catégories d'articles
- Cahier technique §9.2 — typographie : chapeau `var(--text-md)` (20px), corps `var(--text-base)` (18px)
- `docs/sources/icons/icon-image.svg` — placeholder image absente

## Travail attendu

### Page Articles (`/articles`)
- Créer `frontend/src/pages/ArticlesPage.tsx` :

  **Filtres (en haut) :**
  - Par date : sélecteurs année / mois
  - Par catégorie : select avec les 20 valeurs + option « Toutes »

  **Liste journal :**
  - Tri par date de publication décroissante (rendu par l'API)
  - Chaque carte : titre (gras), auteur, date de publication, chapeau (description), image (si renseignée, sinon placeholder logo du site)
  - Pagination standard en bas (pas d'infinite scroll)
  - Clic sur un article → page détail `/articles/{id}`

### Page de détail (`/articles/:id`)
- Créer `frontend/src/pages/ArticleDetailPage.tsx` :
  - **Image hero** en en-tête : pleine largeur, hauteur max 400px, `object-fit: cover`. Si pas d'image → placeholder
  - **Bloc auteur/date/catégorie** à gauche sous le titre :
    - Auteur (si renseigné)
    - Date de publication formatée en français
    - Catégorie en badge
  - **Chapeau** en taille `var(--text-md)` (20px), en italique ou graisse intermédiaire
  - **Corps de l'article** : Markdown rendu (installer une lib de rendu Markdown comme `react-markdown`)
  - **Lien source** (si renseigné) : bouton/lien ouvrant dans un nouvel onglet
  - Colonne de lecture centrée `var(--container-text-max)` (720px)
  - Fil d'ariane : Accueil › Actualités › [Titre de l'article]
  - Bouton Retour en haut à gauche

### Routing
- Ajouter dans `App.tsx` :
  - `/articles` → `ArticlesPage`
  - `/articles/:id` → `ArticleDetailPage`

### Dépendance
- Installer `react-markdown` pour le rendu Markdown (ou réutiliser si déjà installé)

## Outputs

- `frontend/src/pages/ArticlesPage.tsx`
- `frontend/src/pages/ArticleDetailPage.tsx`
- `frontend/src/App.tsx` modifié (routes)
- `package.json` modifié (ajout `react-markdown` si nécessaire)

## Tests automatisés à écrire

- Pas de tests unitaires frontend dans cette version

## Tests manuels (vérification)

- `/articles` affiche la liste triée par date décroissante
- Filtres par catégorie et par date fonctionnent
- Clic sur un article → page détail avec image hero
- Corps Markdown rendu correctement (titres, listes, gras, liens)
- Lien source ouvre un nouvel onglet
- Fil d'ariane et bouton Retour fonctionnels
- Placeholder image quand pas d'image
- Responsive : image hero redimensionnée, colonne de texte 720px → pleine largeur en mobile

## Critères de "Done"

- [ ] Page `/articles` affiche la liste journal triée par date
- [ ] Filtres par catégorie et date fonctionnent
- [ ] Page détail affiche image hero, chapeau, corps Markdown, bloc auteur/date/catégorie
- [ ] Le Markdown est rendu correctement
- [ ] Le lien source s'ouvre dans un nouvel onglet
- [ ] Fil d'ariane et bouton Retour sont présents
- [ ] Placeholder logo si pas d'image
- [ ] Routes ajoutées dans le routeur
