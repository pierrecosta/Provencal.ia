# [TASK-041] Refactoring frontend — Éclatement des pages monolithiques en composants

**Feature :** Architecture frontend
**Rôle cible :** Dev Frontend
**Priorité :** P1 (important)
**Dépendances :** TASK-043
**Statut :** Terminé

## Objectif

Décomposer les pages frontend monolithiques (400–590 lignes) en sous-composants réutilisables et hooks custom par domaine. Actuellement, chaque page mélange état local, logique métier (appels API, gestion formulaires, pagination), et rendu JSX — ce qui rend le code difficile à maintenir, tester et faire évoluer.

## Contexte du problème

| Page | Lignes | Responsabilités mélangées |
|------|:------:|--------------------------|
| `HomePage.tsx` | 588 | Terme du jour, liste sayings, section articles, section événements |
| `AgendaPage.tsx` | 578 | Liste événements, filtres mois/année, formulaire CRUD, pagination, rollback |
| `BibliothequePage.tsx` | 559 | Liste bibliothèque, formulaire CRUD Markdown, pagination, rollback |
| `ArticlesPage.tsx` | 486 | Liste articles, filtres catégorie/année, formulaire CRUD, pagination |
| `DictionnairePage.tsx` | 387 | Recherche bidirectionnelle, filtres graphie/thème/source, pagination |

Seuls 2 hooks custom existent (`useFocusOnNavigation`, `useInfiniteScroll`) et 8 composants UI réutilisables.

## Travail attendu

### Créer des hooks custom par domaine

Chaque hook encapsule l'état et la logique d'un module (appels API, pagination, filtres, CRUD) :

- `frontend/src/hooks/useSayings.ts` :
  - `todaySaying`, `sayings`, `loading`, `error`
  - `fetchTodaySaying()`, `fetchSayings(page, filters)`

- `frontend/src/hooks/useArticles.ts` :
  - `articles`, `total`, `loading`, `error`
  - `fetchArticles(page, filters)`, `createArticle(data)`, `updateArticle(id, data)`, `deleteArticle(id)`, `rollbackArticle(id)`

- `frontend/src/hooks/useEvents.ts` :
  - `events`, `total`, `loading`, `error`
  - `fetchEvents(page, filters)`, `createEvent(data)`, `updateEvent(id, data)`, `deleteEvent(id)`, `rollbackEvent(id)`

- `frontend/src/hooks/useLibrary.ts` :
  - `entries`, `total`, `loading`, `error`
  - `fetchEntries(page)`, `createEntry(data)`, `updateEntry(id, data)`, `deleteEntry(id)`, `rollbackEntry(id)`

- `frontend/src/hooks/useDictionary.ts` :
  - `results`, `themes`, `loading`, `error`
  - `search(q, filters, page)`, `searchProvencal(q, page)`, `fetchThemes()`

### Extraire des sous-composants par domaine

Créer des dossiers de composants par module dans `components/` :

- `frontend/src/components/sayings/` :
  - `SayingOfTheDay.tsx` — affichage du terme du jour (extrait de `HomePage`)
  - `SayingsList.tsx` — liste paginée des sayings (extrait de `HomePage`)

- `frontend/src/components/articles/` :
  - `ArticlesList.tsx` — grille/liste d'articles avec filtres
  - `ArticleForm.tsx` — formulaire création/édition d'article
  - `ArticleFilters.tsx` — filtres catégorie + année

- `frontend/src/components/events/` :
  - `EventsList.tsx` — liste d'événements avec filtres
  - `EventForm.tsx` — formulaire création/édition d'événement
  - `EventFilters.tsx` — filtres mois + année + archive

- `frontend/src/components/library/` :
  - `LibraryList.tsx` — liste des entrées bibliothèque
  - `LibraryForm.tsx` — formulaire avec éditeur Markdown

- `frontend/src/components/dictionary/` :
  - `DictionarySearch.tsx` — barre de recherche + direction
  - `DictionaryResults.tsx` — affichage des résultats
  - `DictionaryFilters.tsx` — filtres graphie, thème, source, catégorie

### Alléger les pages

Après extraction, chaque page ne doit contenir que :
1. L'appel au hook custom
2. L'orchestration des sous-composants
3. La gestion du layout de la page

**Objectif :** chaque page < 150 lignes.

### Règles de refactoring

1. **Aucun changement visuel** : le rendu HTML/CSS doit être strictement identique
2. **Aucun changement de routes** : les URLs restent identiques
3. **Les composants existants** (`ui/`, `layout/`) ne sont pas modifiés
4. **Les hooks reçoivent** des paramètres typés et retournent des objets typés (interfaces TypeScript)
5. **Les appels API dans les hooks** utilisent les fonctions typées des services de TASK-043 (`sayingsService`, `articlesService`, etc.) — pas d'appels `apiFetch` directs

## Outputs

- `frontend/src/hooks/useSayings.ts`
- `frontend/src/hooks/useArticles.ts`
- `frontend/src/hooks/useEvents.ts`
- `frontend/src/hooks/useLibrary.ts`
- `frontend/src/hooks/useDictionary.ts`
- `frontend/src/components/sayings/SayingOfTheDay.tsx`, `SayingsList.tsx`
- `frontend/src/components/articles/ArticlesList.tsx`, `ArticleForm.tsx`, `ArticleFilters.tsx`
- `frontend/src/components/events/EventsList.tsx`, `EventForm.tsx`, `EventFilters.tsx`
- `frontend/src/components/library/LibraryList.tsx`, `LibraryForm.tsx`
- `frontend/src/components/dictionary/DictionarySearch.tsx`, `DictionaryResults.tsx`, `DictionaryFilters.tsx`
- Pages allégées : `HomePage.tsx`, `ArticlesPage.tsx`, `AgendaPage.tsx`, `BibliothequePage.tsx`, `DictionnairePage.tsx`

## Tests automatisés à écrire

- Pas de tests automatisés dans cette tâche (couverts par TASK-042)

## Tests manuels (vérification)

- `npm run build` → compilation sans erreur
- `npm run dev` → navigation sur chaque page, vérifier rendu identique
- Tester en tant que contributeur connecté : formulaires CRUD, rollback, verrouillage
- Vérifier le responsive (mobile < 768px, desktop ≥ 768px)
- Vérifier l'accessibilité clavier (Tab, Enter, Escape)
- Console navigateur : aucune erreur, aucun warning

## Critères de "Done"

- [x] 5 hooks custom créés et fonctionnels
- [x] Sous-composants extraits par domaine (≥ 14 composants)
- [x] Pages allégées (< 150 lignes chacune)
- [x] Rendu visuel strictement identique à l'existant
- [x] Navigation et CRUD fonctionnels
- [x] Les hooks utilisent les services typés de TASK-043 (aucun appel `apiFetch` direct dans les hooks ou pages)
- [x] Attributs d'accessibilité (`aria-*`, rôles, focus) préservés dans les sous-composants extraits
- [x] `npm run build` sans erreur TypeScript
- [x] Console navigateur sans erreur ni warning
