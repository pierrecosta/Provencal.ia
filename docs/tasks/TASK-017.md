# [TASK-017] Frontend — Mode contributeur Sayings (édition inline)

**Feature :** Mémoire vivante — Frontend
**Rôle cible :** Dev Frontend
**Priorité :** P1 (important)
**Dépendances :** TASK-015, TASK-016
**Statut :** Terminé

## Objectif

Ajouter les fonctionnalités CRUD contributeur sur la page Mémoire vivante : boutons d'action visibles uniquement pour les contributeurs authentifiés, formulaires d'édition inline, confirmations de suppression et notifications snackbar.

## Inputs

- `frontend/src/pages/HomePage.tsx` (TASK-016) — page Mémoire vivante (terme du jour + liste)
- `frontend/src/hooks/useAuth.ts` (TASK-015) — `isAuthenticated`, `token`
- `frontend/src/services/api.ts` (TASK-015) — client HTTP avec token
- `backend/app/api/sayings.py` (TASK-011) — endpoints :
  - `POST /api/v1/sayings` (auth) → créer
  - `PUT /api/v1/sayings/{id}` (auth) → modifier
  - `DELETE /api/v1/sayings/{id}` (auth) → supprimer
- `docs/sources/icons/` — icônes contributeur : `icon-ajouter.svg`, `icon-editer.svg`, `icon-valider.svg`, `icon-supprimer.svg`, `icon-annuler.svg`, `icon-verrou.svg`
- Cahier fonctionnel §7.1 — actions : Ajouter, Modifier, Valider, Supprimer, Rollback, Annuler
- Cahier fonctionnel §7.2 — séquence d'interaction : état normal → mode édition → valider/annuler/supprimer
- Cahier fonctionnel §7.3 — verrouillage : icône verrou terracotta si verrouillé par un autre
- Cahier fonctionnel §8.1 — snackbar succès : vert olive, 3s, en bas (desktop) ou au-dessus de la nav (mobile)
- Cahier fonctionnel §8.2 — snackbar erreur : rouge, 4s, même positionnement
- Cahier technique §11.8 — snackbar : desktop `bottom:16px`, mobile `bottom:76px`

## Travail attendu

### Composant Snackbar (réutilisable)

- Créer `frontend/src/components/ui/Snackbar.tsx` :
  - Types : succès (fond #869121) et erreur (fond #B94040)
  - Position : desktop `bottom: 16px`, mobile `bottom: 76px` (au-dessus de la nav)
  - Auto-dismiss : 3s (succès), 4s (erreur)
  - Texte blanc, coins arrondis `var(--radius-md)`

### Composant Modal de confirmation (réutilisable)

- Créer `frontend/src/components/ui/ConfirmModal.tsx` :
  - Modal centré, fond semi-transparent
  - Message de confirmation personnalisable
  - Boutons « Confirmer » (terracotta) et « Annuler » (gris)
  - Accessible : focus piégé, fermeture Escape

### Bouton Ajouter

- Visible en bas de la liste (ou en en-tête) uniquement si `isAuthenticated`
- Au clic : ouvre un formulaire de création (carte éditée avec champs vides)
- Champs du formulaire :
  - Terme provençal (textarea, obligatoire, max 500)
  - Localité d'origine (input, obligatoire, max 200)
  - Traduction / sens en français (textarea, obligatoire)
  - Type (select : vide / Dicton / Expression / Proverbe, optionnel)
  - Contexte (textarea, optionnel)
  - Source (input, optionnel, max 300)
- Validation côté client : champs obligatoires, longueurs max
- Bouton « Valider » → `POST /api/v1/sayings` → snackbar succès → ajout dans la liste
- Bouton « Annuler » → ferme le formulaire

### Bouton Modifier (sur chaque carte)

- Icône crayon en haut à droite de chaque carte, visible uniquement si `isAuthenticated`
- Si l'entrée est verrouillée par un autre contributeur (`is_locked=true` dans la réponse API) : afficher l'icône verrou terracotta avec tooltip *« En cours de modification »* à la place du crayon
- Au clic : bascule la carte en mode édition inline (les textes deviennent des inputs/textarea)
- En mode édition, les icônes affichées : Valider / Supprimer / Annuler
- Bouton « Valider » → `PUT /api/v1/sayings/{id}` → snackbar succès → retour état normal
- Bouton « Annuler » → retour état normal sans sauvegarde
- Erreur 403 (verrouillé) → snackbar erreur

### Bouton Supprimer

- Visible uniquement en mode édition
- Au clic : ouvre `ConfirmModal` avec message *« Supprimer ce terme ? Cette action est irréversible. »*
- Confirmation → `DELETE /api/v1/sayings/{id}` → snackbar succès → retrait de la liste
- Erreur 403 → snackbar erreur

### Copier les icônes contributeur

- Copier depuis `docs/sources/icons/` vers `frontend/src/assets/icons/` : `icon-ajouter.svg`, `icon-editer.svg`, `icon-valider.svg`, `icon-supprimer.svg`, `icon-annuler.svg`, `icon-verrou.svg`

## Outputs

- `frontend/src/components/ui/Snackbar.tsx`
- `frontend/src/components/ui/ConfirmModal.tsx`
- `frontend/src/pages/HomePage.tsx` modifié (boutons contributeur)
- `frontend/src/assets/icons/` — icônes contributeur copiées

## Tests automatisés à écrire

- Pas de tests dans cette tâche (composants visuels interactifs, vérification manuelle)

## Tests manuels (vérification)

### En tant que visiteur (non connecté)

- Page `/` : aucun bouton Ajouter/Modifier/Supprimer visible
- Les cartes sont en lecture seule

### En tant que contributeur (connecté)

- Bouton « + » visible en bas de la liste
- Clic Ajouter → formulaire de création → remplir les champs → Valider → snackbar succès + nouveau terme visible
- Ajouter avec champs obligatoires vides → message d'erreur sous les champs
- Icône crayon visible sur chaque carte
- Clic Modifier → carte en mode édition → modifier le texte → Valider → snackbar succès
- Clic Modifier → Annuler → retour sans modification
- Clic Modifier → Supprimer → modal de confirmation → Confirmer → snackbar succès + carte disparaît
- Clic Modifier → Supprimer → Annuler la modal → rien ne se passe

### Cas verrouillage

- User A clique Modifier sur un terme → User B voit l'icône verrou sur ce terme → pas de bouton Modifier

### Snackbar

- Succès : snackbar verte, disparaît après 3s
- Erreur : snackbar rouge, disparaît après 4s
- Mobile : snackbar positionnée au-dessus de la barre de navigation

## Critères de "Done"

- [x] Boutons contributeur visibles uniquement si authentifié
- [x] Création d'un saying via formulaire inline
- [x] Modification inline avec bascule état normal / édition
- [x] Suppression avec confirmation modale
- [x] Snackbar succès et erreur conformes à la charte
- [x] Icône verrou si verrouillé par un autre contributeur
- [x] Validation des champs obligatoires côté client
- [x] Responsive (desktop + mobile)
- [x] `npm run build` sans erreur TypeScript
