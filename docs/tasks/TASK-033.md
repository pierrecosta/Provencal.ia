# [TASK-033] Frontend — Page Traducteur lexical

**Feature :** Traducteur lexical — Frontend
**Rôle cible :** Dev Frontend
**Priorité :** P1 (important)
**Dépendances :** TASK-014, TASK-032
**Statut :** Terminé

## Objectif

Implémenter la page Traducteur lexical côté frontend : zone de saisie à gauche et résultat traduit à droite (desktop), avec mots inconnus surlignés en jaune, traduction automatique avec debounce 500ms et mention permanente.

## Inputs

- `backend/app/api/translate.py` (TASK-032) — `POST /api/v1/translate`
- `frontend/src/services/api.ts` (TASK-015) — client HTTP
- Cahier fonctionnel §3.3 — traducteur : debounce 500ms, mots inconnus en jaune, mention permanente
- Cahier fonctionnel §6.3 — mise en page : desktop 50/50, mobile empilé
- Cahier technique §11.6 — mots inconnus : fond `#FFF9C4` (jaune pâle)
- Cahier technique §9.1 — `--color-highlight: #FFF9C4`

## Travail attendu

### Page Traducteur (`/traducteur`)
- Créer `frontend/src/pages/TraducteurPage.tsx` :

  **Mention permanente (toujours visible) :**
  - Encart sous le titre :
    > *« Traducteur mot à mot — la traduction automatique de phrases complètes est prévue dans une version future. »*
  - Style : fond léger, texte `var(--text-sm)`, couleur `var(--color-primary)`

  **Zone de saisie :**
  - Textarea avec placeholder « Saisissez votre texte en français... »
  - Pas de bouton « Traduire » — traduction automatique
  - Debounce 500ms après la dernière frappe

  **Zone de résultat :**
  - Affiche le texte traduit
  - Les **mots inconnus** sont mis en évidence avec un fond jaune pâle `var(--color-highlight)`
  - Utiliser `<span>` avec classe CSS pour chaque mot inconnu

  **Layout :**
  - Desktop (≥ 768px) : deux colonnes 50/50 côte à côte (saisie à gauche, résultat à droite)
  - Mobile (< 768px) : empilé (saisie en haut, résultat en dessous)

  **État de chargement :**
  - Pendant la traduction : spinner discret dans la zone de résultat

  **État vide :**
  - Zone de résultat vide tant qu'aucun texte n'est saisi

### Routing
- Ajouter dans `App.tsx` : `/traducteur` → `TraducteurPage`

## Outputs

- `frontend/src/pages/TraducteurPage.tsx`
- `frontend/src/App.tsx` modifié (route)

## Tests automatisés à écrire

- Pas de tests unitaires frontend dans cette version

## Tests manuels (vérification)

- Taper du texte → traduction automatique après 500ms (pas de bouton)
- Les mots inconnus (absents du dictionnaire) sont surlignés en jaune pâle
- La ponctuation est conservée
- La mention permanente est toujours visible
- Desktop : 50/50 côte à côte
- Mobile : empilé (saisie en haut, résultat en dessous)
- Effacer le texte → la zone de résultat se vide

## Critères de "Done"

- [x] La traduction se déclenche automatiquement avec debounce 500ms
- [x] Les mots inconnus sont surlignés en jaune pâle
- [x] La ponctuation est conservée dans le résultat
- [x] La mention permanente est affichée
- [x] Layout 50/50 en desktop, empilé en mobile
- [x] Route ajoutée dans le routeur
