# [TASK-019] Frontend — Pages statiques (À propos, Mentions légales, 404)

**Feature :** Frontend — Pages statiques
**Rôle cible :** Dev Frontend
**Priorité :** P2 (normal)
**Dépendances :** TASK-018
**Statut :** Terminé

## Objectif

Implémenter les 3 pages statiques du portail : « À propos » (présentation du projet), « Mentions légales » (contenu juridique) et la page 404 (route inconnue). Ces pages ne nécessitent pas d'appel API.

## Inputs

- Cahier fonctionnel §3.7 — page « À propos » : 3 blocs (démarche, contributeurs, sources)
- Cahier fonctionnel §3.8 — mentions légales : hébergeur, éditeur, SIRET non applicables, pas de tracking
- Cahier fonctionnel §6.9 — page 404 : message clair + liens vers les 4 modules principaux
- Cahier technique §9.1–9.3 — charte graphique, spacing, typographie
- `frontend/src/components/layout/Layout.tsx` (TASK-014) — layout avec routing

## Travail attendu

### Page « À propos » (`/a-propos`)
- Créer `frontend/src/pages/AProposPage.tsx` :
  - Titre `<h1>` : « À propos »
  - **Bloc 1 — La démarche :** Texte éditorial expliquant le projet (contenu statique codé en dur pour cette version)
  - **Bloc 2 — Les contributeurs :** Liste des contributeurs actifs (pseudo uniquement). Contenu statique pour cette version.
  - **Bloc 3 — Les sources :** Les 7 sources lexicographiques du dictionnaire (auteur, ouvrage, année, zone géographique) sous forme de liste structurée
  - Style : colonne de texte centrée, max-width `var(--container-text-max)` (720px), espacement entre blocs `var(--space-5)` (40px)

### Page « Mentions légales » (`/mentions-legales`)
- Créer `frontend/src/pages/MentionsLegalesPage.tsx` :
  - Titre `<h1>` : « Mentions légales »
  - Sections :
    - Hébergeur : « Non applicable (hébergement privé) »
    - Éditeur : « Non applicable (projet privé non commercial) »
    - SIRET : « Non applicable (particulier) »
    - Données personnelles : « Aucune collecte de données personnelles identifiables. Pas de cookies tiers. Pas de tracking. »
    - Contact : adresse e-mail à renseigner (placeholder)
  - Style : même colonne centrée 720px

### Page 404
- Modifier `frontend/src/pages/NotFoundPage.tsx` (si existant) ou créer :
  - Titre : « Page introuvable »
  - Message : « La page que vous recherchez n'existe pas ou a été déplacée. »
  - 4 liens directs : Accueil (`/`), Dictionnaire (`/dictionnaire`), Agenda (`/agenda`), Bibliothèque (`/bibliotheque`)
  - Style : centré verticalement et horizontalement, liens en boutons ou cartes cliquables

### Routing
- Ajouter les routes dans le routeur principal (`App.tsx`) :
  - `/a-propos` → `AProposPage`
  - `/mentions-legales` → `MentionsLegalesPage`
  - `*` (catch-all) → `NotFoundPage`

## Outputs

- `frontend/src/pages/AProposPage.tsx`
- `frontend/src/pages/MentionsLegalesPage.tsx`
- `frontend/src/pages/NotFoundPage.tsx` (créé ou modifié)
- `frontend/src/App.tsx` modifié (routes ajoutées)

## Tests automatisés à écrire

- Pas de tests unitaires frontend dans cette version

## Tests manuels (vérification)

- `/a-propos` affiche les 3 blocs (démarche, contributeurs, sources)
- `/mentions-legales` affiche le contenu juridique
- URL inexistante → page 404 avec les 4 liens vers les modules principaux
- Les liens dans la page 404 fonctionnent
- Le lien « Mentions légales » dans le footer desktop mène à la bonne page
- Le titre HTML `<title>` est mis à jour pour chaque page

## Critères de "Done"

- [x] Page « À propos » accessible sur `/a-propos` avec les 3 blocs
- [x] Page « Mentions légales » accessible sur `/mentions-legales`
- [x] Page 404 avec message et 4 liens vers les modules
- [x] Routes ajoutées dans le routeur
- [x] Colonne de texte centrée 720px sur les pages statiques
- [x] Aucune régression sur les pages existantes
