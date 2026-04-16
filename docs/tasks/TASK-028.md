# [TASK-028] Frontend — Page Bibliothèque (liste + page de lecture)

**Feature :** Bibliothèque — Frontend
**Rôle cible :** Dev Frontend
**Priorité :** P1 (important)
**Dépendances :** TASK-014, TASK-018, TASK-027
**Statut :** Terminé

## Objectif

Implémenter la page Bibliothèque côté frontend : liste sobre des histoires et légendes avec filtres et défilement infini, et page de lecture avec contenu Markdown rendu, toggle FR/Provençal pour le contenu bilingue, colonne de texte centrée 720px.

## Inputs

- `backend/app/api/library.py` (TASK-027) — endpoints :
  - `GET /api/v1/library?type=&periode=&page=1&per_page=20` → `PaginatedResponse[LibraryResponse]`
  - `GET /api/v1/library/{id}` → `LibraryDetailResponse`
  - `GET /api/v1/library/periodes` → liste des périodes dynamiques
- `frontend/src/services/api.ts` (TASK-015) — client HTTP
- `frontend/src/hooks/useInfiniteScroll.ts` (TASK-016) — hook infinite scroll réutilisable
- `frontend/src/components/ui/Breadcrumb.tsx`, `BackButton.tsx` (TASK-018)
- Cahier fonctionnel §3.5 — bibliothèque : liste sobre, infinite scroll, toggle FR/Provençal, Markdown
- Cahier fonctionnel §6.5 — mise en page : filtres + liste + fin de liste « Toutes les histoires ont été chargées » + icône olivier
- Cahier technique §9.2 — colonne de lecture max 720px
- `docs/sources/icons/icon-olivier.svg` — icône fin de liste
- `docs/sources/icons/icon-toggle-langue.svg` — toggle FR/Provençal

## Travail attendu

### Page Bibliothèque (`/bibliotheque`)
- Créer `frontend/src/pages/BibliothequePage.tsx` :

  **Filtres :**
  - Sélecteur type : Tout / Histoire / Légende (boutons radio ou chips)
  - Par période : select dynamique (valeurs chargées via `GET /library/periodes`)
  - Par lieu : champ texte libre

  **Liste sobre :**
  - Chaque carte : titre + description courte + période. **Pas d'images** en liste.
  - Chargement par défilement infini (réutiliser `useInfiniteScroll`)
  - Clic sur une carte → page lecture `/bibliotheque/{id}`

  **Fin de liste :**
  - Message : *« Toutes les histoires ont été chargées »*
  - Icône olivier `icon-olivier.svg` (décorative)
  - Pas de spinner après la fin

### Page de lecture (`/bibliotheque/:id`)
- Créer `frontend/src/pages/BibliothequeDetailPage.tsx` :
  - Colonne de texte centrée `max-width: 720px`, style article de magazine
  - Titre en `var(--text-xl)` (30px)
  - Période et typologie en badge sous le titre
  - Description longue : **Markdown rendu** via `react-markdown`
  - Image (si renseignée) : affichée en haut sous le titre, pleine largeur colonne
  - Lien source (si renseigné) : bouton ouvrant dans un nouvel onglet
  - **Toggle FR/Provençal :** affiché **uniquement** si `has_translation == true`. Au clic, charge la version liée via `GET /library/{traduction_id}`. Bouton bascule avec icône `icon-toggle-langue.svg`.
  - Fil d'ariane : Accueil › Culture › [Titre]
  - Bouton Retour

### Routing
- Ajouter dans `App.tsx` :
  - `/bibliotheque` → `BibliothequePage`
  - `/bibliotheque/:id` → `BibliothequeDetailPage`

### Icônes
- Copier : `icon-olivier.svg`, `icon-toggle-langue.svg`

## Outputs

- `frontend/src/pages/BibliothequePage.tsx`
- `frontend/src/pages/BibliothequeDetailPage.tsx`
- `frontend/src/App.tsx` modifié (routes)
- `frontend/src/assets/icons/` — icônes copiées

## Tests automatisés à écrire

- Pas de tests unitaires frontend dans cette version

## Tests manuels (vérification)

- `/bibliotheque` affiche la liste sobre (titre + description courte + période, pas d'images)
- Infinite scroll fonctionne, fin de liste avec message + icône olivier
- Filtres type/période/lieu fonctionnent
- Page de lecture : Markdown rendu, colonne 720px
- Toggle FR/Provençal visible uniquement si version bilingue disponible
- Toggle charge et affiche l'autre version
- Fil d'ariane et bouton Retour fonctionnels
- Responsive : colonne 720px → pleine largeur mobile

## Critères de "Done"

- [x] Liste sobre avec titre + description courte + période (pas d'images)
- [x] Infinite scroll fonctionnel avec message de fin + icône olivier
- [x] Filtres type, période, lieu fonctionnent
- [x] Page de lecture avec Markdown rendu et colonne 720px
- [x] Toggle FR/Provençal affiché seulement si traduction disponible
- [x] Routes ajoutées dans le routeur
- [x] Fil d'ariane et bouton Retour présents
