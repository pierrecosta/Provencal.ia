# [TASK-016] Frontend — Page d'accueil Mémoire vivante (visiteur)

**Feature :** Mémoire vivante — Frontend
**Rôle cible :** Dev Frontend
**Priorité :** P0 (bloquant)
**Dépendances :** TASK-014, TASK-011
**Statut :** Terminé

## Objectif

Implémenter la page d'accueil du portail, exclusivement dédiée à la Mémoire vivante : le terme du jour en position mise en avant, suivi de la liste complète des dictons/expressions/proverbes avec filtres et défilement infini.

## Inputs

- `backend/app/api/sayings.py` (TASK-011) — endpoints :
  - `GET /api/v1/sayings/today` → `SayingResponse`
  - `GET /api/v1/sayings?type=&localite=&page=1&per_page=20` → `PaginatedResponse[SayingResponse]`
- `frontend/src/services/api.ts` (TASK-015) — client HTTP
- `frontend/src/components/layout/` (TASK-014) — layout avec route `/`
- Cahier fonctionnel §6.1 — page d'accueil : terme du jour + liste, filtres type/localité, infinite scroll, message fin de liste avec icône cigale
- Cahier technique §11.5 — terme du jour : carte largeur 100%, bordure 2px #D5713F (terracotta), titre 36px
- Cahier technique §9.2 — typographie : termes provençaux en Georgia serif
- `docs/sources/icons/icon-cigale.svg` — icône fin de liste

## Travail attendu

- Créer `frontend/src/pages/HomePage.tsx` — page d'accueil :

  ### Bloc Terme du jour (en haut)
  - Appeler `GET /api/v1/sayings/today` au montage
  - Carte mise en avant :
    - Bordure terracotta `2px solid var(--color-secondary)`
    - Terme provençal en `var(--text-2xl)` (36px), police serif (Georgia)
    - Type (Dicton/Expression/Proverbe) en badge sous le terme
    - Localité d'origine
    - Traduction/sens en français en `var(--text-base)` (18px)
  - État de chargement : spinner centré dans la carte
  - État vide (aucun saying en base) : message explicatif

  ### Filtres (sous le terme du jour)
  - Sélecteur de type : boutons radio ou chips — Tout / Dicton / Expression / Proverbe
  - Champ localité : champ texte libre avec placeholder « Filtrer par localité... »
  - Les filtres mettent à jour la liste en temps réel (rechargement de la première page)

  ### Liste des sayings (infinite scroll)
  - Appeler `GET /api/v1/sayings?page=1&per_page=20` au montage avec les filtres actifs
  - Chaque carte affiche : terme provençal (Georgia, gras) + type + localité + traduction/sens
  - Chargement par défilement infini :
    - Observer le bas de la liste via `IntersectionObserver`
    - Charger la page suivante quand le bas est visible
    - Pendant le chargement : spinner sous la liste
  - **Fin de liste :** Quand toutes les entrées sont chargées, afficher :
    > *« Vous avez parcouru toute la Mémoire vivante »*
    avec l'icône cigale (`icon-cigale.svg`) — pas de spinner

- Copier `docs/sources/icons/icon-cigale.svg` vers `frontend/src/assets/icons/` (si pas déjà fait)

- Créer `frontend/src/hooks/useInfiniteScroll.ts` — hook réutilisable pour l'infinite scroll :
  - Paramètres : fetchFunction, page, hasMore
  - Retourne : items, loading, loadMore, ref (à attacher au sentinel)

## Outputs

- `frontend/src/pages/HomePage.tsx`
- `frontend/src/hooks/useInfiniteScroll.ts`
- `frontend/src/assets/icons/icon-cigale.svg`

## Tests automatisés à écrire

- Pas de tests dans cette tâche (composant visuel, vérification manuelle)

## Tests manuels (vérification)

- Seeder les sayings (`python -m scripts.seed_sayings` — TASK-013)
- Page `/` : terme du jour visible en haut avec bordure terracotta
- Terme provençal en grande police serif
- Liste de sayings sous le terme du jour
- Scroller → les pages suivantes se chargent automatiquement
- Fin de liste → message + icône cigale, pas de spinner
- Filtrer par type « Dicton » → seuls les dictons sont affichés
- Filtrer par localité « Marseille » → résultats filtrés
- Mobile (devtools responsive <768px) : mise en page empilée, marges adaptées
- Desktop : carte terme du jour centrée, max-width 1100px

## Critères de "Done"

- [x] Terme du jour affiché avec la charte (bordure terracotta, 36px, serif)
- [x] Liste des sayings avec infinite scroll fonctionnel
- [x] Filtres type et localité opérationnels
- [x] Message fin de liste avec icône cigale
- [x] Responsive (desktop ≥768px, mobile <768px)
- [x] Pas de doublon de données au scroll
- [x] `npm run build` sans erreur TypeScript
