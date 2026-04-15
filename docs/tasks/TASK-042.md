# [TASK-042] Tests frontend — Couverture minimale React Testing Library

**Feature :** Qualité frontend
**Rôle cible :** Dev Frontend
**Priorité :** P1 (important)
**Dépendances :** TASK-041, TASK-043
**Statut :** À faire

## Objectif

Mettre en place l'infrastructure de test frontend et écrire une couverture minimale sur les pages, composants et hooks critiques. Le projet n'a actuellement **aucun test frontend** — c'est un risque majeur pour un site ciblant des seniors (accessibilité critique, interactions CRUD contributeur).

## Contexte du problème

- 0 test frontend, 0 configuration de test (pas de Vitest, pas de jest, pas de testing-library)
- 15 pages, 14 composants, 7+ hooks — aucune couverture
- Public cible : seniors 60–90 ans → l'accessibilité et la stabilité du rendu sont critiques
- Flux contributeur (CRUD, rollback, verrouillage) non testés côté client

## Travail attendu

### 1. Setup de l'infrastructure de test

- Installer les dépendances de test :
  ```bash
  npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
  ```
- Configurer Vitest dans `vite.config.ts` :
  ```ts
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  }
  ```
- Créer `frontend/src/test/setup.ts` :
  - Import `@testing-library/jest-dom`
  - Mock global de `fetch` (ou `apiFetch`)
- Ajouter le script dans `package.json` : `"test": "vitest run"`, `"test:watch": "vitest"`

### 2. Tests des composants UI réutilisables

- `frontend/src/components/ui/__tests__/ConfirmModal.test.tsx` :
  - `test_renders_message` — affiche le message passé en prop
  - `test_confirm_calls_handler` — clic sur confirmer → appelle `onConfirm`
  - `test_cancel_calls_handler` — clic sur annuler → appelle `onCancel`
  - `test_escape_closes` — touche Escape → appelle `onCancel`

- `frontend/src/components/ui/__tests__/Snackbar.test.tsx` :
  - `test_renders_text` — affiche le texte du snackbar
  - `test_auto_disappears` — disparaît après le délai

- `frontend/src/components/ui/__tests__/Breadcrumb.test.tsx` :
  - `test_renders_items` — affiche le fil d'ariane
  - `test_last_item_not_link` — le dernier élément n'est pas cliquable

### 3. Tests des pages principales (smoke tests)

Chaque test vérifie que la page se monte sans crash et affiche les éléments essentiels. Les appels API sont mockés.

- `frontend/src/pages/__tests__/HomePage.test.tsx` :
  - `test_renders_without_crash` — la page se monte
  - `test_displays_terme_du_jour_section` — section terme du jour présente
  - `test_displays_sayings_list` — liste des dictons présente

- `frontend/src/pages/__tests__/DictionnairePage.test.tsx` :
  - `test_renders_search_input` — champ de recherche présent
  - `test_search_displays_results` — recherche → résultats affichés

- `frontend/src/pages/__tests__/ConnexionPage.test.tsx` :
  - `test_renders_login_form` — formulaire avec pseudo + mot de passe
  - `test_submit_calls_api` — soumission → appel API login
  - `test_error_message_on_failure` — erreur 401 → message affiché

- `frontend/src/pages/__tests__/ArticlesPage.test.tsx` :
  - `test_renders_articles_list` — liste d'articles affichée
  - `test_filters_displayed` — filtres catégorie/année présents

- `frontend/src/pages/__tests__/AgendaPage.test.tsx` :
  - `test_renders_events_list` — liste d'événements affichée
  - `test_archive_toggle` — bascule archives fonctionnelle

### 4. Tests du contexte d'authentification

- `frontend/src/context/__tests__/AuthContext.test.tsx` :
  - `test_initial_state_unauthenticated` — état initial : pas de token, pas de user
  - `test_login_sets_token` — login réussi → token stocké, user disponible
  - `test_logout_clears_token` — logout → token supprimé
  - `test_401_triggers_logout` — réponse 401 → déconnexion automatique

### 5. Tests des hooks custom (si TASK-041 terminée)

- `frontend/src/hooks/__tests__/useSayings.test.ts` :
  - `test_fetch_today_saying` — appel API → saying retourné
  - `test_loading_state` — loading true pendant le fetch

- `frontend/src/hooks/__tests__/useDictionary.test.ts` :
  - `test_search_returns_results` — recherche → résultats
  - `test_empty_query_no_fetch` — query vide → pas d'appel API

## Outputs

- `frontend/src/test/setup.ts`
- `frontend/vite.config.ts` (modifié — ajout config test)
- `frontend/package.json` (modifié — scripts test + devDependencies)
- `frontend/src/components/ui/__tests__/ConfirmModal.test.tsx`
- `frontend/src/components/ui/__tests__/Snackbar.test.tsx`
- `frontend/src/components/ui/__tests__/Breadcrumb.test.tsx`
- `frontend/src/pages/__tests__/HomePage.test.tsx`
- `frontend/src/pages/__tests__/DictionnairePage.test.tsx`
- `frontend/src/pages/__tests__/ConnexionPage.test.tsx`
- `frontend/src/pages/__tests__/ArticlesPage.test.tsx`
- `frontend/src/pages/__tests__/AgendaPage.test.tsx`
- `frontend/src/context/__tests__/AuthContext.test.tsx`
- `frontend/src/hooks/__tests__/useSayings.test.ts` (si TASK-041 terminée)
- `frontend/src/hooks/__tests__/useDictionary.test.ts` (si TASK-041 terminée)

## Tests automatisés à écrire

C'est cette tâche elle-même. Objectif : **≥ 30 tests frontend** couvrant les composants UI, pages principales, contexte auth et hooks.

## Tests manuels (vérification)

- `cd frontend && npm run test` → tous les tests passent
- `npm run build` → compilation toujours OK (pas de régression)
- Vérifier la couverture : `npx vitest run --coverage` (objectif ≥ 40% des fichiers critiques)

## Critères de "Done"

- [ ] Infrastructure Vitest + React Testing Library configurée
- [ ] Scripts `test` et `test:watch` dans `package.json`
- [ ] ≥ 30 tests écrits et passants
- [ ] Tests composants UI : ConfirmModal, Snackbar, Breadcrumb
- [ ] Smoke tests pages : HomePage, Dictionnaire, Connexion, Articles, Agenda
- [ ] Tests AuthContext : login, logout, 401
- [ ] Les mocks ciblent les services typés de TASK-043 (pas de mock `fetch` global)
- [ ] `npm run build` sans régression
- [ ] `npm run test` → 0 échec
- [ ] Couverture ≥ 40% sur les fichiers critiques (hooks, context, composants UI)
