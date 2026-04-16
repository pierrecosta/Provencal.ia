# [TASK-035] Frontend — Mode contributeur Agenda (édition inline)

**Feature :** Agenda culturel — Frontend
**Rôle cible :** Dev Frontend
**Priorité :** P1 (important)
**Dépendances :** TASK-017, TASK-023, TASK-034
**Statut :** Terminé

## Objectif

Ajouter les boutons d'action contributeur (Ajouter, Modifier, Valider, Supprimer, Rollback, Annuler) sur la page Agenda, en réutilisant les composants Snackbar et ConfirmModal créés dans TASK-017.

## Inputs

- `frontend/src/pages/AgendaPage.tsx` (TASK-023) — page Agenda
- `frontend/src/components/ui/Snackbar.tsx`, `ConfirmModal.tsx` (TASK-017) — composants réutilisables
- `frontend/src/context/AuthContext.tsx` (TASK-015) — `isAuthenticated`, `token`
- `backend/app/api/events.py` (TASK-021) — endpoints POST, PUT, DELETE, rollback
- Cahier fonctionnel §7.1–7.3 — actions contributeur, séquence d'interaction, verrouillage

## Travail attendu

### Bouton Ajouter
- Bouton « + Ajouter un événement » visible en haut de la page si `isAuthenticated`
- Formulaire de création :
  - Titre (input, obligatoire, max 200)
  - Date de début (input date, obligatoire)
  - Date de fin (input date, obligatoire, ≥ date de début)
  - Lieu (input, optionnel, max 200)
  - Description (textarea, optionnel, max 1000)
  - Lien externe (input URL, optionnel, max 500)
- Validation client : champs obligatoires, date_fin ≥ date_debut

### Bouton Modifier (sur chaque événement)
- Icône crayon visible si `isAuthenticated` et élément non verrouillé par un autre
- Si verrouillé : icône verrou terracotta
- Bascule en mode édition inline → icônes Valider / Supprimer / Rollback / Annuler

### Bouton Rollback
- Icône flèche courbe `icon-rollback.svg`
- Appelle `POST /events/{id}/rollback`
- Snackbar succès ou erreur

### Mêmes patterns que TASK-017 (Sayings)
- Valider → PUT → snackbar succès
- Supprimer → ConfirmModal → DELETE → snackbar succès
- Annuler → retour état normal
- Rollback → POST rollback → snackbar succès

## Outputs

- `frontend/src/pages/AgendaPage.tsx` modifié (boutons contributeur)
- `frontend/src/assets/icons/icon-rollback.svg` (copié si pas déjà fait)

## Tests automatisés à écrire

- Pas de tests unitaires frontend

## Tests manuels (vérification)

- Visiteur : aucun bouton d'action visible
- Contributeur : bouton Ajouter visible, formulaire fonctionnel
- Modifier un événement → sauvegarder → succès
- Supprimer → confirmation → succès
- Rollback → dernière action annulée
- Verrouillage : two-user scenario → icône verrou

## Critères de "Done"

- [x] Boutons contributeur visibles uniquement si authentifié
- [x] Création d'un événement via formulaire
- [x] Modification inline avec validation
- [x] Suppression avec confirmation modale
- [x] Rollback fonctionnel
- [x] Verrouillage affiché si élément verrouillé par un autre
- [x] Snackbar succès/erreur
