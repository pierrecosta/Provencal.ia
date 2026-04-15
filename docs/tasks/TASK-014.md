# [TASK-014] Frontend — Layout principal + Navigation desktop/mobile

**Feature :** Frontend — Socle UI
**Rôle cible :** Dev Frontend
**Priorité :** P0 (bloquant)
**Dépendances :** TASK-008
**Statut :** À faire

## Objectif

Créer le layout principal de l'application avec la barre de navigation à 7 entrées. La navigation est le squelette du site — chaque page future s'insère dans ce layout. La barre est fixe en haut (desktop) ou en bas (mobile) et conforme à la charte graphique.

## Inputs

- `frontend/` (TASK-008) — projet React/Vite scaffoldé, variables CSS intégrées
- `docs/sources/icons/` — SVG de navigation (`icon-accueil.svg`, `icon-articles.svg`, `icon-langue.svg`, `icon-dictionnaire.svg`, `icon-traducteur.svg`, `icon-agenda.svg`, `icon-culture.svg`, `icon-a-propos.svg`, `icon-compte.svg`)
- Cahier fonctionnel §5.1 — 7 entrées : Accueil | Actualités | Langue | Agenda | Culture | À propos | Compte
- Cahier fonctionnel §5.2 — Desktop ≥768px, Mobile <768px
- Cahier fonctionnel §5.3 — Navigation desktop : barre fixe en haut, 64px, logo à gauche, menu centré, Compte à droite
- Cahier fonctionnel §5.4 — Navigation mobile : barre fixe en bas, 60px, 7 entrées, icône + libellé ≤8 caractères
- Cahier fonctionnel §5.5 — Accessibilité : aria-current, navigation clavier, aria-label
- Cahier technique §11.1 — Desktop : fond #F9F7F2, bordure #D1CEC7, entrée active bold + soulignement #869121
- Cahier technique §11.2 — Mobile : fond #F9F7F2, bordure + ombre, entrée active #869121 bold
- Cahier technique §11.3 — ARIA : aria-current="page", Tab/Enter/Escape, scroll-margin-top
- Cahier technique §9.4 — Breakpoints : Mobile <768px, Desktop ≥768px

## Travail attendu

- Installer `react-router-dom` (routing SPA)
- Créer la structure de composants :
  - `frontend/src/components/layout/Layout.tsx` — composant wrapper avec nav + `<Outlet>` pour les pages enfants + padding-top/bottom selon le mode
  - `frontend/src/components/layout/NavbarDesktop.tsx` — barre de navigation desktop (fixe en haut)
  - `frontend/src/components/layout/NavbarMobile.tsx` — barre de navigation mobile (fixe en bas)
  - `frontend/src/components/layout/LanguageSubmenu.tsx` — sous-menu "Langue" : dropdown desktop (au clic/focus) et bottom sheet mobile (`<dialog>` natif)

- Copier les SVG de navigation depuis `docs/sources/icons/` vers `frontend/src/assets/icons/`

- Implémenter les 7 entrées de navigation (icône + libellé) :
  | Libellé | Route | Icône |
  |---------|-------|-------|
  | Accueil | `/` | icon-accueil.svg |
  | Actualités | `/articles` | icon-articles.svg |
  | Langue | (sous-menu) | icon-langue.svg |
  | → Dictionnaire | `/dictionnaire` | icon-dictionnaire.svg |
  | → Traducteur | `/traducteur` | icon-traducteur.svg |
  | Agenda | `/agenda` | icon-agenda.svg |
  | Culture | `/bibliotheque` | icon-culture.svg |
  | À propos | `/a-propos` | icon-a-propos.svg |
  | Compte | `/connexion` | icon-compte.svg |

- Configurer React Router dans `frontend/src/App.tsx` :
  - Toutes les routes avec le `Layout` comme parent
  - Pages placeholder (composant vide avec juste un `<h1>` du nom de la page) pour chaque route
  - Page 404 catch-all

- Implémenter le focus SPA : replacer le focus sur le `<h1>` de la page après chaque navigation (cahier fonctionnel §4.5)

- Desktop : logo texte « Provençal.ia » à gauche, menu centré, Compte isolé à droite
- Mobile : libellés raccourcis ≤8 caractères, pas de logo, titre de page dans un header séparé

## Outputs

- `frontend/src/components/layout/Layout.tsx`
- `frontend/src/components/layout/NavbarDesktop.tsx`
- `frontend/src/components/layout/NavbarMobile.tsx`
- `frontend/src/components/layout/LanguageSubmenu.tsx`
- `frontend/src/assets/icons/` — SVG copiés
- `frontend/src/App.tsx` — routage complet
- Pages placeholder pour chaque route

## Tests automatisés à écrire

- Pas de tests dans cette tâche (composants visuels, vérification manuelle)

## Tests manuels (vérification)

- `npm run dev` → naviguer entre toutes les pages (desktop et mobile via devtools responsive)
- Desktop : barre fixe en haut, logo visible, sous-menu Langue au clic, fermeture Escape
- Mobile : barre fixe en bas, 7 entrées, sous-menu Langue en bottom sheet
- Entrée active : gras + couleur primaire
- Navigation clavier : Tab parcourt les entrées, Enter active, Escape ferme le sous-menu
- `aria-current="page"` visible dans le DOM sur l'entrée active
- Redimensionner la fenêtre au-delà de 768px/en-dessous : transition fluide entre les deux modes
- Page 404 : URL inconnue → page 404 affichée

## Critères de "Done"

- [ ] Navigation desktop 7 entrées + logo + sous-menu Langue
- [ ] Navigation mobile 7 entrées + bottom sheet Langue
- [ ] Icônes SVG intégrées
- [ ] Routing React Router fonctionnel (toutes les routes)
- [ ] Page 404
- [ ] Accessibilité ARIA complète (aria-current, aria-label, focus SPA, clavier)
- [ ] Responsive : breakpoint 768px
- [ ] `npm run build` sans erreur TypeScript
