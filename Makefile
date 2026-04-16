.PHONY: help env build up down restart logs logs-back logs-front \
       db-shell migrate \
       seed seed-dict seed-articles seed-events seed-sayings seed-library seed-user \
       test test-back test-front lint clean reset

# ── Configuration ───────────────────────────────────────────────────────────
COMPOSE = docker compose

help: ## Afficher cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ── Environnement ──────────────────────────────────────────────────────────
env: ## Créer .env depuis .env.example (si absent)
	@test -f .env || (cp .env.example .env && echo "✔ .env créé — pensez à modifier les valeurs")
	@test -f .env && echo ".env existe déjà" || true

# ── Docker ──────────────────────────────────────────────────────────────────
build: env ## Construire les images Docker
	$(COMPOSE) build

up: env ## Démarrer tous les services (db + backend + frontend)
	$(COMPOSE) up -d
	@echo ""
	@echo "  Backend  → http://localhost:8000"
	@echo "  Frontend → http://localhost:5173"
	@echo "  Swagger  → http://localhost:8000/docs"
	@echo ""

down: ## Arrêter tous les services
	$(COMPOSE) down

restart: down up ## Redémarrer tous les services

logs: ## Suivre les logs de tous les services
	$(COMPOSE) logs -f

logs-back: ## Suivre les logs du backend uniquement
	$(COMPOSE) logs -f backend

logs-front: ## Suivre les logs du frontend uniquement
	$(COMPOSE) logs -f frontend

# ── Base de données ────────────────────────────────────────────────────────
db-shell: ## Ouvrir un psql dans le conteneur PostgreSQL
	$(COMPOSE) exec db psql -U $${POSTGRES_USER:-provencial_user} -d $${POSTGRES_DB:-provencial_db}

migrate: ## Lancer les migrations Alembic
	$(COMPOSE) exec backend alembic upgrade head

# ── Seeds ───────────────────────────────────────────────────────────────────
seed-dict: ## Importer le dictionnaire (docs/sources/src_dict.csv)
	$(COMPOSE) exec backend python -m scripts.seed_dictionary

seed-articles: ## Importer les articles (docs/sources/articles_init.txt)
	$(COMPOSE) exec backend python -m scripts.seed_articles

seed-events: ## Importer les événements (docs/sources/agenda_init.txt)
	$(COMPOSE) exec backend python -m scripts.seed_events

seed-sayings: ## Importer les dictons (docs/sources/sayings_init.txt)
	$(COMPOSE) exec backend python -m scripts.seed_sayings

seed-library: ## Importer la bibliothèque (docs/sources/histoire_init.txt)
	$(COMPOSE) exec backend python -m scripts.seed_library

seed-user: ## Créer un contributeur (make seed-user PSEUDO=xxx PASSWORD=yyy)
	$(COMPOSE) exec backend python -m scripts.seed_user --pseudo $(PSEUDO) --password $(PASSWORD)

seed: seed-dict seed-articles seed-events seed-sayings seed-library ## Importer TOUTES les données de seed
	@echo "✔ Toutes les données de seed ont été importées"

# ── Tests ───────────────────────────────────────────────────────────────────
test-back: ## Lancer les tests backend (pytest)
	$(COMPOSE) exec backend pytest -v

test-front: ## Lancer les tests frontend (vitest)
	$(COMPOSE) exec frontend npm test

test: test-back test-front ## Lancer tous les tests (backend + frontend)

# ── Lint ────────────────────────────────────────────────────────────────────
lint: ## Lancer le lint frontend (eslint)
	$(COMPOSE) exec frontend npm run lint

# ── Nettoyage ───────────────────────────────────────────────────────────────
clean: down ## Arrêter et supprimer les volumes (⚠ perte de données)
	@echo "⚠  Ceci va supprimer le volume PostgreSQL (toutes les données)."
	@read -p "Continuer ? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	$(COMPOSE) down -v
	@echo "✔ Volumes supprimés"

reset: clean build up migrate seed ## Repartir de zéro : rebuild + migrate + seed
	@echo "✔ Projet réinitialisé avec toutes les données"
