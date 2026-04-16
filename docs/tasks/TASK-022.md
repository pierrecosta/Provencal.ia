# [TASK-022] Agenda — Seed données + tests backend

**Feature :** Agenda culturel — Backend
**Rôle cible :** Dev Backend
**Priorité :** P1 (important)
**Dépendances :** TASK-021
**Statut :** Terminé

## Objectif

Importer les 5 événements culturels de test depuis `docs/sources/agenda_init.txt` en base de données via un script Python autonome pour disposer de données réalistes dans le module Agenda.

## Inputs

- `docs/sources/agenda_init.txt` — 5 événements culturels avec dates et lieux réels
- `backend/app/models/agenda_event.py` (TASK-002) — modèle `AgendaEvent`
- `backend/app/core/database.py` (TASK-001) — `engine`, `async_session_maker`
- `backend/scripts/seed_sayings.py` (TASK-013) — pattern de script standalone à réutiliser

## Travail attendu

- Lire et analyser le format de `docs/sources/agenda_init.txt`
- Créer `backend/scripts/seed_events.py` :
  - Script exécutable en standalone : `python -m scripts.seed_events` (depuis `backend/`)
  - Parse le fichier `docs/sources/agenda_init.txt`
  - Insère les 5 entrées dans la table `agenda_events` via SQLAlchemy
  - Gère les doublons : si un événement avec le même titre + date_debut existe déjà, le sauter
  - Affiche un résumé : `Importé : XX | Ignoré (doublons) : YY | Total : 5`
  - Utilise `asyncio.run()` pour exécuter les opérations async

## Outputs

- `backend/scripts/seed_events.py`

## Tests automatisés à écrire

- Pas de test automatisé (script de maintenance)

## Tests manuels (vérification)

- `python -m scripts.seed_events` → résumé affiché
- Relancer → tous ignorés (doublons)
- `GET /api/v1/events` → événements visibles

## Critères de "Done"

- [x] Script `seed_events.py` créé et fonctionnel
- [x] Les 5 événements sont importés sans doublon
- [x] Le résumé d'import est affiché
- [x] Les données sont visibles via l'API
