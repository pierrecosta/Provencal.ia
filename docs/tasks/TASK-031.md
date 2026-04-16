# [TASK-031] Frontend — Page Dictionnaire (recherche + filtres + pagination)

**Feature :** Dictionnaire — Frontend
**Rôle cible :** Dev Frontend
**Priorité :** P0 (bloquant)
**Dépendances :** TASK-014, TASK-029
**Statut :** Terminé

## Objectif

Implémenter la page Dictionnaire côté frontend : sélecteur de direction FR↔Provençal, champ de recherche, filtres en cascade thème/catégorie, filtre graphie/source, tableau de résultats à deux colonnes avec traductions groupées en accordéon, pagination et suggestions de mots proches.

## Inputs

- `backend/app/api/dictionary.py` (TASK-029) — endpoints :
  - `GET /api/v1/dictionary?q=&theme=&categorie=&graphie=&source=&page=1&per_page=20`
  - `GET /api/v1/dictionary/search?q=` (Prov→FR)
  - `GET /api/v1/dictionary/themes` (mapping thème → catégories)
- `frontend/src/services/api.ts` (TASK-015) — client HTTP
- Cahier fonctionnel §3.2 — filtres, recherche bidirectionnelle, suggestions, accordéon traductions
- Cahier fonctionnel §6.2 — mise en page : sélecteur direction, recherche, filtres, tableau, pagination
- Cahier technique §9.2 — typographie : termes provençaux en Georgia serif
- `docs/sources/icons/icon-toggle-langue.svg` — sélecteur direction
- `docs/sources/icons/icon-recherche.svg` — champ de recherche
- `docs/sources/icons/icon-deplier.svg`, `icon-replier.svg` — accordéon
- `docs/sources/icons/icon-filtre.svg` — bouton filtres

## Travail attendu

### Page Dictionnaire (`/dictionnaire`)
- Créer `frontend/src/pages/DictionnairePage.tsx` :

  **Sélecteur de direction (haut de page) :**
  - Deux boutons : « FR → Provençal » / « Provençal → FR »
  - Le bouton actif est mis en relief (fond `var(--color-primary)`, texte blanc)
  - La direction active change l'endpoint appelé et l'ordre des colonnes

  **Champ de recherche :**
  - Input texte avec icône loupe `icon-recherche.svg`
  - Appel API avec debounce (300ms)
  - Quand `q` est renseigné : **griser les filtres** Thème/Catégorie (ils sont désactivés pendant la recherche — cahier fonctionnel §3.2)

  **Filtres (sous la recherche) :**
  - Filtre par thème : select alimenté par `GET /dictionary/themes`
  - Filtre par catégorie : select en cascade, mis à jour selon le thème choisi
  - Filtre par graphie : Mistralienne / Classique IEO / Toutes
  - Filtre par source : select avec les 7 sources (TradEG, TradD, etc.)
  - Sur mobile : deux sélecteurs empilés

  **Tableau de résultats :**
  - Deux colonnes : Mot français | Traduction provençale (inversées en mode Prov→FR)
  - Les traductions provençales sont affichées en police serif (Georgia)
  - **Accordéon :** si un mot a plusieurs traductions (par source), elles sont groupées dans un bloc dépliable au clic. Icône `icon-deplier.svg` / `icon-replier.svg`
  - Une ligne par mot français — clic pour déplier toutes les traductions disponibles (source + région)
  - Tri alphabétique par mot français (rendu par l'API)

  **Suggestions :**
  - Si aucun résultat exact : afficher les suggestions retournées par l'API
  - Texte : *« Mot non trouvé. Mots proches : [suggestion1] [suggestion2] ... »*
  - Chaque suggestion est cliquable et relance la recherche

  **États vides :**
  - Mot en base sans traduction → *« Mot non traduit »*
  - Mot absent → *« Pas de mot trouvé »*

  **Pagination (bas de page) :**
  - Sélecteur de résultats par page : 10 / 20 / 50 / 100 (défaut 20)
  - Boutons Précédent / Suivant avec icônes `icon-precedent.svg` / `icon-suivant.svg`
  - Affichage du numéro de page courante / total

### Routing
- Ajouter dans `App.tsx` : `/dictionnaire` → `DictionnairePage`

### Icônes
- Copier depuis `docs/sources/icons/` : `icon-recherche.svg`, `icon-deplier.svg`, `icon-replier.svg`, `icon-filtre.svg`, `icon-precedent.svg`, `icon-suivant.svg`

## Outputs

- `frontend/src/pages/DictionnairePage.tsx`
- `frontend/src/App.tsx` modifié (route)
- `frontend/src/assets/icons/` — icônes copiées

## Tests automatisés à écrire

- Pas de tests unitaires frontend dans cette version

## Tests manuels (vérification)

- `/dictionnaire` affiche le sélecteur de direction, la recherche, les filtres et le tableau
- Recherche FR→Prov : taper « maison » → résultats avec traductions
- Recherche Prov→FR : basculer la direction, taper un mot provençal → résultats
- Les filtres thème/catégorie fonctionnent en cascade
- Les filtres sont grisés quand un texte de recherche est saisi
- L'accordéon déplie les traductions multiples
- Les suggestions s'affichent si le mot n'est pas trouvé
- Pagination fonctionnelle (10/20/50/100)
- Les termes provençaux sont en police serif (Georgia)
- Responsive : filtres empilés en mobile, tableau adapté

## Critères de "Done"

- [x] Sélecteur de direction FR↔Provençal fonctionnel
- [x] Recherche avec debounce et résultats en temps réel
- [x] Filtres en cascade thème → catégorie
- [x] Les filtres se grisent quand la recherche textuelle est active
- [x] Accordéon pour les traductions multiples par source
- [x] Suggestions de mots proches quand aucun résultat exact
- [x] Pagination 10/20/50/100 fonctionnelle
- [x] Termes provençaux en police serif
- [x] États vides conformes (« Mot non traduit », « Pas de mot trouvé »)
- [x] Route ajoutée dans le routeur
