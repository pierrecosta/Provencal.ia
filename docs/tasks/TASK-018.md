# [TASK-018] Frontend — Fil d'ariane + Bouton Retour + Footer desktop

**Feature :** Frontend — Socle UI
**Rôle cible :** Dev Frontend
**Priorité :** P1 (important)
**Dépendances :** TASK-014
**Statut :** Terminé

## Objectif

Créer les composants UI transversaux nécessaires aux pages de détail et au layout global : fil d'ariane avec liens cliquables, bouton Retour explicite, et pied de page desktop avec les crédits lexicographiques.

## Inputs

- `frontend/src/components/layout/Layout.tsx` (TASK-014) — layout principal
- Cahier fonctionnel §8.5 — fil d'ariane sur toutes les pages de détail + bouton « ← Retour » en haut à gauche
- Cahier fonctionnel §6.10 — footer desktop minimal : crédits lexicographiques + lien « Mentions légales ». Absent en mobile.
- Cahier fonctionnel §10.4 — 7 sources lexicographiques (Garcin, Autran, Achard, Honnorat, Avril, Pellas, Fourvières)
- Cahier technique §9.2 — tailles texte : légendes `var(--text-xs)` (12px)
- `docs/sources/icons/icon-retour.svg` — icône bouton Retour

## Travail attendu

### Fil d'ariane
- Créer `frontend/src/components/ui/Breadcrumb.tsx` :
  - Props : `items: Array<{ label: string, path?: string }>` — le dernier élément est la page courante (pas de lien)
  - Séparateur : `›`
  - Taille texte : `var(--text-xs)` (12px)
  - Les liens intermédiaires sont cliquables (react-router `<Link>`)
  - Accessible : `<nav aria-label="Fil d'ariane">`

### Bouton Retour
- Créer `frontend/src/components/ui/BackButton.tsx` :
  - Bouton « ← Retour » positionné en haut à gauche de la page de détail
  - Utilise `useNavigate(-1)` de react-router-dom
  - Icône `icon-retour.svg` + libellé « Retour »
  - Zone cliquable ≥ 44×44px (norme WCAG tactile)
  - Style : texte `var(--color-primary)`, pas de fond

### Footer desktop
- Créer `frontend/src/components/layout/Footer.tsx` :
  - Affiché uniquement en desktop (≥ 768px), masqué en mobile (la barre de nav mobile remplace le footer)
  - Contenu : « Sources lexicographiques : Garcin (1823) · Autran · Achard (1785) · Honnorat (1846) · Avril (1834) · Pellas (1723) · Fourvières (1901) »
  - Lien « Mentions légales » vers `/mentions-legales`
  - Style : fond `var(--color-bg)`, bordure haute `1px solid var(--color-border)`, texte `var(--text-xs)`, padding `var(--space-2)`
- Intégrer le footer dans `Layout.tsx`
- Copier `docs/sources/icons/icon-retour.svg` vers `frontend/src/assets/icons/`

## Outputs

- `frontend/src/components/ui/Breadcrumb.tsx`
- `frontend/src/components/ui/BackButton.tsx`
- `frontend/src/components/layout/Footer.tsx`
- `frontend/src/components/layout/Layout.tsx` modifié (intégration footer)

## Tests automatisés à écrire

- Pas de tests unitaires frontend dans cette version

## Tests manuels (vérification)

- Le fil d'ariane affiche le chemin correct avec liens cliquables (sauf page courante)
- Le bouton Retour ramène à la page précédente
- Le footer desktop affiche les 7 sources et le lien « Mentions légales »
- Le footer est masqué en mobile (< 768px)
- La zone cliquable du bouton Retour fait ≥ 44×44px

## Critères de "Done"

- [x] Composant `Breadcrumb` créé et accessible (`aria-label`)
- [x] Composant `BackButton` créé avec zone tactile ≥ 44×44px
- [x] Footer desktop affiché avec crédits lexicographiques
- [x] Footer invisible en mobile
- [x] Icône `icon-retour.svg` copiée dans les assets
- [x] Layout.tsx intègre le footer
- [x] Aucune régression sur les pages existantes
