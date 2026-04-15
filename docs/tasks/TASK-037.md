# [TASK-037] Frontend — Mode contributeur Bibliothèque (édition inline + Markdown)

**Feature :** Bibliothèque — Frontend
**Rôle cible :** Dev Frontend
**Priorité :** P1 (important)
**Dépendances :** TASK-017, TASK-028, TASK-026, TASK-034
**Statut :** À faire

## Objectif

Ajouter les boutons d'action contributeur sur la page Bibliothèque, avec support de l'éditeur Markdown en prévisualisation temps réel, upload d'image, autocomplétion des périodes et lien bidirectionnel traduction.

## Inputs

- `frontend/src/pages/BibliothequePage.tsx` (TASK-028) — page Bibliothèque
- `frontend/src/components/ui/Snackbar.tsx`, `ConfirmModal.tsx` (TASK-017)
- `frontend/src/utils/imageCompression.ts` (TASK-036)
- `backend/app/api/library.py` (TASK-027) — endpoints POST, PUT, DELETE, rollback, périodes
- Cahier fonctionnel §7.5 — prévisualisation Markdown : desktop 50/50 temps réel, mobile onglets Éditeur/Prévisualisation
- Cahier fonctionnel §3.5 — périodes avec autocomplétion, contenu bilingue lien traduction_id

## Travail attendu

### Éditeur Markdown avec prévisualisation
- Créer `frontend/src/components/ui/MarkdownEditor.tsx` :
  - Props : `value` (string), `onChange` (callback)
  - **Desktop (≥ 768px) :** éditeur textarea à gauche, prévisualisation rendue à droite (50/50), mise à jour en temps réel
  - **Mobile (< 768px) :** deux onglets « Éditeur » / « Prévisualisation », bascule manuelle
  - Utilise `react-markdown` pour le rendu de la prévisualisation

### Formulaire de création/édition bibliothèque
- Champs :
  - Titre (input, obligatoire, max 200)
  - Typologie (select : vide / Histoire / Légende, optionnel)
  - Période (input avec **autocomplétion** sur les valeurs existantes via `GET /library/periodes`)
  - Description courte (input, optionnel, max 200, texte brut)
  - Description longue (MarkdownEditor, optionnel)
  - Image : upload fichier ou URL (même UX que TASK-036)
  - URL source (input, optionnel)
  - Langue (select : fr / oc, défaut fr)
  - Lien traduction (select : choix parmi les entrées existantes de l'autre langue, optionnel)

### Boutons contributeur
- Mêmes patterns : Ajouter, Modifier, Valider, Supprimer, Rollback, Annuler
- La suppression libère le lien traduction (géré côté API)

## Outputs

- `frontend/src/components/ui/MarkdownEditor.tsx`
- `frontend/src/pages/BibliothequePage.tsx` modifié

## Tests automatisés à écrire

- Pas de tests unitaires frontend

## Tests manuels (vérification)

- Éditeur Markdown : taper du Markdown à gauche → prévisualisation à droite en temps réel (desktop)
- Mobile : onglets Éditeur / Prévisualisation fonctionnent
- Autocomplétion période : taper « Moy » → suggestion « Moyen Âge »
- Upload image fonctionnel
- Lien traduction : sélectionner une entrée de l'autre langue → lien bidirectionnel
- Rollback fonctionnel

## Critères de "Done"

- [ ] Éditeur Markdown avec prévisualisation temps réel (desktop 50/50)
- [ ] Mobile : onglets Éditeur / Prévisualisation
- [ ] Autocomplétion des périodes
- [ ] Upload d'image avec compression
- [ ] Lien traduction bidirectionnel via select
- [ ] Rollback fonctionnel
- [ ] Snackbar succès/erreur
