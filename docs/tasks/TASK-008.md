# [TASK-008] Scaffolding frontend React + Vite + TypeScript

**Feature :** Fondations & Initialisation
**Rôle cible :** Dev Frontend
**Priorité :** P1 (important)
**Dépendances :** Aucune
**Statut :** Terminé

## Objectif

Initialiser le projet frontend React 18 + TypeScript avec Vite dans le répertoire `frontend/`. Le frontend doit démarrer, afficher une page d'accueil minimale et être buildable dans un conteneur Docker.

## Inputs

- `docker-compose.yml` — service `frontend` avec `build: ./frontend`, port `5173`
- `.env.example` — `VITE_API_URL=http://localhost:8000`
- Cahier technique §1.1 — React 18, TypeScript, Vite
- Cahier technique §9.1 — Palette « Terre de Provence » (variables CSS)
- Cahier technique §9.2 — Échelle typographique (variables CSS)
- Cahier technique §9.3 — Référentiel de spacing (variables CSS)

## Travail attendu

- Supprimer `frontend/.gitkeep`
- Initialiser le projet dans `frontend/` via `npm create vite@latest . -- --template react-ts`
- Nettoyer les fichiers Vite par défaut (supprimer le contenu demo dans `App.tsx`, `App.css`, `index.css`)
- Créer `frontend/src/styles/variables.css` avec les CSS custom properties du cahier technique :
  - Palette de couleurs (§9.1) : `--color-bg`, `--color-text`, `--color-primary`, `--color-secondary`, `--color-border`, `--color-error`, `--color-highlight`
  - Échelle typographique (§9.2) : `--text-xs` à `--text-3xl`
  - Spacing (§9.3) : `--space-1` à `--space-8`, container, touch-target, radius
- Créer `frontend/src/styles/global.css` avec les styles de base :
  - `html { font-size: 100%; }` (respect réglage navigateur)
  - `body { font-family: Inter, system-ui, sans-serif; font-size: var(--text-base); line-height: 1.7; color: var(--color-text); background: var(--color-bg); }`
  - `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }`
- Modifier `frontend/src/App.tsx` : afficher un titre « Provençal.ia » centré, avec la couleur primaire (`--color-primary`)
- Configurer `frontend/vite.config.ts` : `server.host = '0.0.0.0'` et `server.port = 5173` (pour le conteneur Docker)
- Créer `frontend/Dockerfile` :
  ```dockerfile
  FROM node:20-slim
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
  ```
- Vérifier que `npm run dev` fonctionne en local
- Vérifier que `npm run build` compile sans erreur TypeScript

## Outputs

- `frontend/` — projet Vite React TypeScript complet
- `frontend/Dockerfile`
- `frontend/src/styles/variables.css`
- `frontend/src/styles/global.css`
- `frontend/src/App.tsx` modifié (page minimale)

## Tests automatisés à écrire

- Pas de tests dans cette tâche (le frontend n'a pas encore de logique à tester)

## Tests manuels (vérification)

- `cd frontend && npm install && npm run dev` → page accessible sur `http://localhost:5173`
- La page affiche « Provençal.ia » en vert olive sur fond blanc cassé
- `npm run build` → compilation sans erreur
- `docker build -t provencial-front ./frontend` → image construite sans erreur

## Critères de "Done"

- [x] `frontend/` contient un projet React 18 + TypeScript fonctionnel
- [x] Variables CSS du cahier technique intégrées (palette, typo, spacing)
- [x] Styles globaux appliqués (font-size base 18px, Inter, fond coquille d'œuf)
- [x] `npm run dev` affiche une page
- [x] `npm run build` compile sans erreur
- [x] `frontend/Dockerfile` existe et build sans erreur
- [x] `vite.config.ts` configuré pour écouter sur `0.0.0.0:5173`
