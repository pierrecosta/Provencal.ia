# [TASK-039] Intégration finale — Vérification stack complète tous modules

**Feature :** Intégration
**Rôle cible :** TechLead
**Priorité :** P0 (bloquant)
**Dépendances :** TASK-017 à TASK-038
**Statut :** Terminé

## Objectif

Valider l'intégration de tous les modules du portail : vérifier que tous les services démarrent ensemble, que tous les endpoints API fonctionnent, que toutes les pages frontend sont accessibles et que les interactions contributeur (CRUD, rollback, verrouillage, upload) fonctionnent de bout en bout.

## Inputs

- Toutes les tâches TASK-017 à TASK-038
- Données de seed complètes : sayings, events, articles, library, dictionary

## Travail attendu

### Reset et seed complet
- `docker-compose down -v && docker-compose up --build`
- Exécuter tous les scripts de seed dans l'ordre :
  1. `python -m scripts.seed_user --pseudo admin --password admin123`
  2. `python -m scripts.seed_sayings`
  3. `python -m scripts.seed_events`
  4. `python -m scripts.seed_articles`
  5. `python -m scripts.seed_library`
  6. `python -m scripts.seed_dictionary`

### Vérification API (via curl ou Swagger)
- `GET /health` → 200
- `POST /auth/login` → token
- `POST /auth/logout` → token révoqué
- `GET /sayings/today` → terme du jour
- `GET /sayings` → liste paginée
- `GET /events` → événements à venir
- `GET /events?archive=true` → archives
- `GET /articles` → liste triée par date
- `GET /library` → liste
- `GET /library/{id}` → détail
- `GET /dictionary?q=maison` → résultats
- `GET /dictionary/search?q=oustau` → résultats Prov→FR
- `POST /translate` → traduction mot-à-mot

### Vérification frontend
- Naviguer sur chaque page : Accueil, Dictionnaire, Traducteur, Agenda, Bibliothèque, Articles, À propos, Mentions légales
- Vérifier le responsive (mobile < 768px, desktop ≥ 768px)
- Se connecter → vérifier les boutons contributeur sur chaque module
- Tester CRUD complet sur un module (créer, modifier, supprimer, rollback)
- Vérifier le verrouillage (deux sessions simultanées)
- Uploader une image (Bibliothèque ou Articles)
- Importer un petit fichier CSV dictionnaire

### Vérification accessibilité
- Navigation clavier sur toutes les pages (Tab, Enter, Escape)
- `aria-current="page"` sur l'entrée de menu active
- Focus sur `<h1>` après changement de route
- Sous-menu Langue : fermeture Escape
- Contrastes WCAG AA vérifiés (outils dev browser)

### Corrections
- Corriger les bugs trouvés
- Vérifier la console navigateur (pas d'erreurs JS)
- Vérifier la console docker (pas d'erreurs Python unhandled)

## Outputs

- Corrections de bugs éventuelles
- Confirmation que la stack est fonctionnelle

## Tests automatisés à écrire

- Pas de test automatisé — vérification manuelle d'intégration

## Tests manuels (vérification)

Checklist complète ci-dessus.

## Critères de "Done"

- [ ] Les 3 services démarrent ensemble sans erreur
- [ ] Toutes les données de seed sont importées
- [ ] Tous les endpoints API sont accessibles et fonctionnels
- [ ] Toutes les pages frontend sont accessibles et correctement stylées
- [ ] Le mode contributeur fonctionne sur tous les modules
- [ ] Le responsive est correct (mobile + desktop)
- [ ] L'accessibilité clavier est vérifiée
- [ ] Pas d'erreur dans la console navigateur ni dans la console Docker
