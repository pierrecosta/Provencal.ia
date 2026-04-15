# [TASK-023] Frontend — Page Agenda (liste + détail + archives)

**Feature :** Agenda culturel — Frontend
**Rôle cible :** Dev Frontend
**Priorité :** P1 (important)
**Dépendances :** TASK-014, TASK-018, TASK-021
**Statut :** À faire

## Objectif

Implémenter la page Agenda côté frontend : les 3 prochains événements en cartes larges, la liste compacte des autres événements à venir, l'accès aux archives, la page de détail d'un événement avec bande terracotta, et les filtres par lieu et date.

## Inputs

- `backend/app/api/events.py` (TASK-021) — endpoints :
  - `GET /api/v1/events` → `PaginatedResponse[EventResponse]`
  - `GET /api/v1/events?archive=true&annee=&mois=` → archives
- `frontend/src/services/api.ts` (TASK-015) — client HTTP
- `frontend/src/components/ui/Breadcrumb.tsx`, `BackButton.tsx` (TASK-018)
- Cahier fonctionnel §3.4 — 3 prochains événements en cartes larges, reste en liste compacte, archives par année/mois
- Cahier fonctionnel §6.4 — page détail : titre + dates + lieu en bande terracotta, description, lien externe
- Cahier fonctionnel §3.4 — état vide : événement fictif « Mise à jour à faire par l'administrateur »
- Cahier technique §11.7 — bande détail : `background: #D5713F`, `color: white`
- `docs/sources/icons/icon-lien-externe.svg`, `icon-date.svg`, `icon-localite.svg`, `icon-archive.svg`

## Travail attendu

### Page Agenda (`/agenda`)
- Créer `frontend/src/pages/AgendaPage.tsx` :

  **Mise en avant (haut de page) :**
  - Les 3 prochains événements en cartes larges : date de début + lieu + titre
  - Style : carte avec bordure `var(--color-border)`, date mise en exergue, titre en `var(--text-lg)` (24px)
  - Chaque carte est cliquable → lien vers `/agenda/{id}`

  **Liste compacte (sous les cartes) :**
  - Les événements suivants en liste compacte chronologique
  - Chaque ligne : date de début — titre — lieu
  - Pagination standard (pas d'infinite scroll)

  **État vide :**
  - Si aucun événement à venir : carte fictive avec la mention *« Mise à jour à faire par l'administrateur »*

  **Filtres :**
  - Par lieu : champ texte libre
  - Par date : sélecteurs année / mois

  **Lien Archives :**
  - Bouton/lien « Archives » en bas de page ou en haut
  - Mène vers la vue archives (`/agenda?archive=true`)

### Vue archives (`/agenda?archive=true`)
- Même page `AgendaPage.tsx`, détection du paramètre `archive=true`
- Affiche les événements passés triés par `date_debut DESC`
- Filtres par année et mois
- Pagination standard

### Page de détail (`/agenda/:id`)
- Créer `frontend/src/pages/AgendaDetailPage.tsx` :
  - Bande supérieure : titre + dates (début–fin) + lieu, fond terracotta `var(--color-secondary)`, texte blanc
  - Description complète sous la bande
  - Lien externe (si renseigné) : bouton avec icône `icon-lien-externe.svg`, ouvre dans un nouvel onglet
  - Fil d'ariane : Accueil › Agenda › [Titre de l'événement]
  - Bouton Retour en haut à gauche

### Routing
- Ajouter dans `App.tsx` :
  - `/agenda` → `AgendaPage`
  - `/agenda/:id` → `AgendaDetailPage`

### Icônes
- Copier depuis `docs/sources/icons/` vers `frontend/src/assets/icons/` : `icon-lien-externe.svg`, `icon-date.svg`, `icon-localite.svg`, `icon-archive.svg`

## Outputs

- `frontend/src/pages/AgendaPage.tsx`
- `frontend/src/pages/AgendaDetailPage.tsx`
- `frontend/src/App.tsx` modifié (routes)
- `frontend/src/assets/icons/` — icônes copiées

## Tests automatisés à écrire

- Pas de tests unitaires frontend dans cette version

## Tests manuels (vérification)

- `/agenda` affiche les 3 prochains événements en cartes larges + le reste en liste
- Clic sur une carte → page détail avec bande terracotta
- Aucun événement à venir → carte fictive « Mise à jour à faire par l'administrateur »
- Filtres lieu et date fonctionnent
- Lien « Archives » → événements passés
- Lien externe s'ouvre dans un nouvel onglet
- Fil d'ariane et bouton Retour fonctionnels
- Responsive : cartes empilées en mobile

## Critères de "Done"

- [ ] Les 3 prochains événements sont en cartes larges
- [ ] Le reste est en liste compacte chronologique
- [ ] L'état vide affiche l'événement fictif
- [ ] Les filtres par lieu et date fonctionnent
- [ ] La vue archives est accessible
- [ ] La page de détail a une bande terracotta avec titre/dates/lieu
- [ ] Le lien externe ouvre un nouvel onglet
- [ ] Fil d'ariane et bouton Retour sont présents
- [ ] Routes ajoutées dans le routeur
