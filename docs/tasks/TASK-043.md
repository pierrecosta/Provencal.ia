# [TASK-043] Refactoring frontend — Centralisation des appels API par domaine

**Feature :** Architecture frontend
**Rôle cible :** Dev Frontend
**Priorité :** P1 (important)
**Dépendances :** TASK-039
**Statut :** À faire

## Objectif

Créer un fichier de service API par domaine métier pour centraliser tous les appels backend. Actuellement, `services/api.ts` (36 lignes) ne fournit qu'un wrapper `apiFetch` générique — les appels API concrets (URLs, paramètres, parsing des réponses) sont dispersés directement dans les pages. Cela produit de la duplication, rend le mocking difficile pour les tests, et rend les changements d'API fragiles.

## Contexte du problème

- `services/api.ts` : 36 lignes — uniquement un wrapper `fetch` avec gestion du token
- Les URLs d'API (`/api/v1/sayings`, `/api/v1/articles?page=...`) sont hardcodées dans chaque page
- La même logique de parsing JSON est dupliquée dans chaque composant
- En cas de changement d'endpoint backend, il faut chercher dans toutes les pages
- Le mocking pour les tests (TASK-042) nécessite de mocker `fetch` globalement au lieu de mocker un service typé

## Travail attendu

### Conserver `api.ts` comme couche transport

Le fichier `services/api.ts` reste inchangé — il fournit `apiFetch` et `configureApi`.

### Créer un fichier service par domaine

Chaque fichier exporte des fonctions typées qui encapsulent les appels à `apiFetch` :

- `frontend/src/services/sayingsService.ts` :
  ```ts
  export async function fetchTodaySaying(): Promise<Saying>
  export async function fetchSayings(params: SayingsParams): Promise<PaginatedResponse<Saying>>
  export async function createSaying(data: SayingCreate): Promise<Saying>
  export async function updateSaying(id: number, data: SayingUpdate): Promise<Saying>
  export async function deleteSaying(id: number): Promise<void>
  export async function rollbackSaying(id: number): Promise<Saying>
  ```

- `frontend/src/services/articlesService.ts` :
  ```ts
  export async function fetchArticles(params: ArticlesParams): Promise<PaginatedResponse<Article>>
  export async function fetchArticle(id: number): Promise<Article>
  export async function createArticle(data: FormData): Promise<Article>
  export async function updateArticle(id: number, data: FormData): Promise<Article>
  export async function deleteArticle(id: number): Promise<void>
  export async function rollbackArticle(id: number): Promise<Article>
  ```

- `frontend/src/services/eventsService.ts` :
  ```ts
  export async function fetchEvents(params: EventsParams): Promise<PaginatedResponse<AgendaEvent>>
  export async function fetchEvent(id: number): Promise<AgendaEvent>
  export async function createEvent(data: FormData): Promise<AgendaEvent>
  export async function updateEvent(id: number, data: FormData): Promise<AgendaEvent>
  export async function deleteEvent(id: number): Promise<void>
  export async function rollbackEvent(id: number): Promise<AgendaEvent>
  ```

- `frontend/src/services/libraryService.ts` :
  ```ts
  export async function fetchLibraryEntries(params: PaginationParams): Promise<PaginatedResponse<LibraryEntry>>
  export async function fetchLibraryEntry(id: number): Promise<LibraryEntry>
  export async function createLibraryEntry(data: FormData): Promise<LibraryEntry>
  export async function updateLibraryEntry(id: number, data: FormData): Promise<LibraryEntry>
  export async function deleteLibraryEntry(id: number): Promise<void>
  export async function rollbackLibraryEntry(id: number): Promise<LibraryEntry>
  ```

- `frontend/src/services/dictionaryService.ts` :
  ```ts
  export async function fetchThemes(): Promise<ThemeCategories>
  export async function searchDictionary(params: DictSearchParams): Promise<PaginatedResponse<DictEntry>>
  export async function searchProvencal(params: ProvSearchParams): Promise<PaginatedResponse<DictEntry>>
  ```

- `frontend/src/services/translateService.ts` :
  ```ts
  export async function translate(text: string, graphie?: string): Promise<TranslateResult>
  ```

- `frontend/src/services/authService.ts` :
  ```ts
  export async function login(pseudo: string, password: string): Promise<LoginResponse>
  export async function logout(): Promise<void>
  ```

### Créer les types TypeScript

- `frontend/src/services/types.ts` — interfaces partagées :
  - `PaginatedResponse<T>` (items, total, page, per_page, pages)
  - `PaginationParams` (page, per_page)
  - Interfaces par domaine : `Saying`, `Article`, `AgendaEvent`, `LibraryEntry`, `DictEntry`, etc.

### Migrer les pages

- Remplacer les appels `apiFetch('/api/v1/...')` dans les pages par les fonctions de service typées
- Supprimer la construction manuelle d'URL et le parsing JSON des pages

### Règles

1. **Chaque service utilise `apiFetch`** comme unique point d'appel HTTP
2. **Les fonctions sont typées** : paramètres d'entrée et retour avec interfaces TypeScript
3. **Gestion des erreurs** : les services lancent des erreurs typées, les pages les attrapent
4. **Pas de changement visuel ni fonctionnel**

## Outputs

- `frontend/src/services/types.ts`
- `frontend/src/services/sayingsService.ts`
- `frontend/src/services/articlesService.ts`
- `frontend/src/services/eventsService.ts`
- `frontend/src/services/libraryService.ts`
- `frontend/src/services/dictionaryService.ts`
- `frontend/src/services/translateService.ts`
- `frontend/src/services/authService.ts`
- Pages modifiées pour utiliser les services

## Tests automatisés à écrire

- `frontend/src/services/__tests__/sayingsService.test.ts` :
  - `test_fetchTodaySaying_calls_correct_url` — vérifie l'URL appelée
  - `test_fetchSayings_passes_params` — vérifie les query params
  - `test_createSaying_sends_body` — vérifie le body envoyé
  - `test_error_handling` — erreur API → exception typée

- `frontend/src/services/__tests__/authService.test.ts` :
  - `test_login_sends_credentials` — vérifie l'envoi form-urlencoded
  - `test_logout_calls_endpoint` — vérifie l'appel POST logout

## Tests manuels (vérification)

- `npm run build` → compilation sans erreur
- `npm run dev` → navigation complète, tous les modules fonctionnels
- Tester CRUD contributeur sur chaque module → comportement identique
- Console navigateur : aucune erreur réseau, aucune erreur JS
- `npm run test` → tests passent (si TASK-042 déjà réalisée)

## Critères de "Done"

- [ ] 7 fichiers de services API créés + 1 fichier types
- [ ] Toutes les pages utilisent les services au lieu d'appels `apiFetch` directs
- [ ] Plus aucune URL d'API hardcodée dans les pages ni les composants
- [ ] Plus aucun appel `apiFetch` direct dans les pages (— uniquement dans les fichiers `services/*Service.ts`)
- [ ] Interfaces TypeScript pour tous les objets API (zéro `any`)
- [ ] `npm run build` sans erreur TypeScript (mode strict)
- [ ] Comportement fonctionnel identique (vérification manuelle navigation complète)
- [ ] Tests services passent (si infra test disponible)
