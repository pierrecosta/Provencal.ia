# [TASK-045] Page « À propos » — Édition inline par les contributeurs

**Feature :** Frontend + Backend — Page « À propos »
**Rôle cible :** Dev Full-stack
**Priorité :** P2 (normal)
**Dépendances :** TASK-019, TASK-007
**Statut :** Terminé

## Objectif

Transformer la page « À propos » d'une page statique (contenu hardcodé) en page partiellement éditable par les contributeurs authentifiés. Les blocs « Démarche » et « Sources » deviennent modifiables en ligne. Le bloc « Contributeurs » est généré dynamiquement depuis la table `users`.

## Contexte fonctionnel

Voir cahier fonctionnel §3.7 et §6.8.

## Travail attendu — Backend

### Migration BDD
- Créer une migration Alembic pour ajouter la table `a_propos_content` :
  ```
  id         SERIAL PRIMARY KEY
  bloc       VARCHAR(20) UNIQUE NOT NULL CHECK (bloc IN ('demarche', 'sources'))
  contenu    TEXT NOT NULL DEFAULT ''
  locked_by  INTEGER → users.id (ON DELETE SET NULL)
  locked_at  TIMESTAMP
  updated_by INTEGER → users.id (ON DELETE SET NULL)
  updated_at TIMESTAMP DEFAULT now()
  ```
- Insérer les deux lignes initiales (`demarche` et `sources`) dans la migration, avec le contenu actuel de `AProposPage.tsx` comme valeur par défaut.

### Modèle SQLAlchemy
- Créer `backend/app/models/a_propos.py` : modèle `AProposContent`

### Schémas Pydantic
- Créer `backend/app/schemas/a_propos.py` :
  - `AProposBlocOut` : `bloc`, `contenu`, `locked_by`, `locked_at`
  - `AProposOut` : `demarche: AProposBlocOut`, `sources: AProposBlocOut`, `contributors: list[str]`
  - `AProposBlocUpdate` : `contenu: str`

### Endpoints API
Créer `backend/app/api/a_propos.py` (routeur, prefix `/a-propos`) :

| Méthode | Route | Auth | Description |
|---------|-------|:----:|-------------|
| GET | `/a-propos` | Non | Retourne les deux blocs + liste des pseudos (`users.pseudo`) |
| PUT | `/a-propos/{bloc}` | Oui | Modifier le contenu (`demarche` ou `sources`). Vérifie le verrou. Écrit dans `edit_log`. |
| POST | `/a-propos/{bloc}/lock` | Oui | Acquérir le verrou (pose `locked_by` + `locked_at`) |
| DELETE | `/a-propos/{bloc}/lock` | Oui | Libérer le verrou |

Enregistrer le routeur dans `backend/app/main.py`.

## Travail attendu — Frontend

- Modifier `frontend/src/pages/AProposPage.tsx` :
  - Charger le contenu depuis `GET /api/v1/a-propos` au montage du composant
  - **Bloc « Contributeurs »** : afficher la liste `contributors` retournée par l'API (lecture seule)
  - **Blocs « Démarche » et « Sources »** : si le contributeur est connecté, afficher le bouton « Modifier » conforme au mode contributeur (§7 du cahier fonctionnel)
  - Séquence d'édition inline : clic Modifier → POST lock → textarea pré-rempli → boutons Valider / Annuler → PUT contenu → DELETE lock
  - Si un bloc est verrouillé par un autre contributeur : icône verrou (terracotta) + tooltip « En cours de modification » à la place du bouton Modifier
  - Rollback : bouton visible en mode édition, appelle le mécanisme existant via `edit_log`

## Outputs

- `backend/alembic/versions/xxxx_add_a_propos_content.py`
- `backend/app/models/a_propos.py`
- `backend/app/schemas/a_propos.py`
- `backend/app/api/a_propos.py`
- `backend/app/main.py` modifié (routeur ajouté)
- `frontend/src/pages/AProposPage.tsx` modifié

## Tests automatisés à écrire

- `backend/tests/test_a_propos.py` :
  - `test_get_a_propos` : GET `/a-propos` → 200, blocs présents, liste contributors non vide
  - `test_update_bloc_authenticated` : PUT `/a-propos/demarche` (authentifié) → 200, contenu mis à jour
  - `test_update_bloc_unauthenticated` : PUT sans token → 401
  - `test_lock_bloc` : POST lock → bloc verrouillé en base
  - `test_update_locked_by_other` : PUT sur un bloc verrouillé par un autre utilisateur → 423

## Tests manuels (vérification)

- Visiteur : `/a-propos` affiche les 3 blocs, pas de bouton Modifier visible
- Contributeur connecté : boutons Modifier visibles sur les blocs Démarche et Sources, absent sur Contributeurs
- Modifier un bloc → sauvegarder → le contenu est mis à jour à l'écran
- Annuler → le contenu revient à la valeur précédente
- Rollback → le contenu revient à l'état avant la dernière sauvegarde
- Second contributeur → blocs en cours d'édition affichent l'icône verrou

## Critères de "Done"

- [ ] Table `a_propos_content` créée et seedée via migration
- [ ] GET `/a-propos` retourne blocs + liste contributors
- [ ] PUT `/a-propos/{bloc}` modifie le contenu (auth requis)
- [ ] Verrouillage fonctionnel (lock/unlock, expiration 30 min)
- [ ] Frontend charge le contenu depuis l'API
- [ ] Boutons Modifier présents uniquement pour les contributeurs connectés
- [ ] Bloc « Contributeurs » en lecture seule (généré depuis `users`)
- [ ] Tests backend passants
