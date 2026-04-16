# [TASK-020] Frontend — Avertissement expiration session + Focus SPA

**Feature :** Frontend — Socle UI
**Rôle cible :** Dev Frontend
**Priorité :** P2 (normal)
**Dépendances :** TASK-015
**Statut :** Terminé

## Objectif

Implémenter deux comportements transversaux du frontend : (1) l'avertissement pré-expiration de session avec compte à rebours lorsqu'un formulaire d'édition est ouvert, et (2) le repositionnement du focus sur le `<h1>` après chaque changement de route SPA (conformité WCAG 2.4.3).

## Inputs

- `frontend/src/context/AuthContext.tsx` (TASK-015) — gestion du token, durée 60 min
- Cahier fonctionnel §8.3 — avertissement 5 min avant expiration si formulaire ouvert, compte à rebours (5 min, 3 min, 1 min), bannière en haut de page
- Cahier fonctionnel §4.5 — focus replacé sur `<h1>` après chaque changement de route
- Cahier technique §11.3 — `scroll-margin-top: 64px` sur les cibles d'ancre desktop

## Travail attendu

### Avertissement expiration session
- Créer `frontend/src/components/ui/SessionWarning.tsx` :
  - Bannière en haut de page (sous la navbar desktop, au-dessus du contenu)
  - Texte : *« Votre session expire dans X minutes. Enregistrez vos modifications pour ne pas les perdre. »*
  - Compte à rebours affiché : 5 min, 3 min, 1 min
  - Fond : `var(--color-secondary)` (terracotta), texte blanc
  - Visible uniquement si :
    - L'utilisateur est authentifié
    - Un formulaire d'édition est ouvert (contexte partagé via un state global ou contexte)
    - Le token expire dans ≤ 5 minutes
  - Calculer le temps restant à partir du moment de connexion + `ACCESS_TOKEN_EXPIRE_MINUTES` (60 min)
- Intégrer `SessionWarning` dans `Layout.tsx`

### Focus SPA
- Créer un hook `frontend/src/hooks/useFocusOnNavigation.ts` :
  - Écouter les changements de route via `useLocation()` de react-router-dom
  - À chaque changement de route : chercher le `<h1>` de la page, lui ajouter `tabIndex={-1}` si absent, et appeler `.focus()` dessus
  - Scroll en haut de la page (`window.scrollTo(0, 0)`)
- Intégrer le hook dans `Layout.tsx`
- Ajouter `scroll-margin-top: 64px` (desktop) sur les `<h1>` pour compenser la navbar fixe

## Outputs

- `frontend/src/components/ui/SessionWarning.tsx`
- `frontend/src/hooks/useFocusOnNavigation.ts`
- `frontend/src/components/layout/Layout.tsx` modifié (intégration warning + hook)
- `frontend/src/styles/global.css` modifié (ajout `scroll-margin-top` sur `h1`)

## Tests automatisés à écrire

- Pas de tests unitaires frontend dans cette version

## Tests manuels (vérification)

- Se connecter, ouvrir un formulaire d'édition, attendre 55 min → la bannière apparaît avec « 5 minutes »
- (Test accéléré : modifier temporairement la durée du token à 6 min pour vérifier le comportement)
- La bannière disparaît si le formulaire est fermé
- Naviguer entre les pages → le focus se place sur le `<h1>` à chaque navigation
- Vérifier avec un lecteur d'écran que le `<h1>` est bien annoncé après navigation

## Critères de "Done"

- [x] Bannière d'avertissement visible 5 min avant expiration si formulaire ouvert
- [x] Compte à rebours affiché (5 min, 3 min, 1 min)
- [x] La bannière disparaît si aucun formulaire d'édition n'est ouvert
- [x] Le focus se replace sur `<h1>` après chaque changement de route
- [x] `scroll-margin-top: 64px` appliqué sur les `<h1>` en desktop
- [x] Aucune régression sur les pages existantes
