-- =============================================================
-- Provencal.ia — Schéma de base de données (init)
-- Version : v1.9 (14/04/2026)
-- Stack   : PostgreSQL 15+
-- Encodage: UTF-8
-- Conventions :
--   • locked_by appliqué sur tous les modules éditoriaux
--   • Les images sont stockées en référence (chemin local ou URL)
--     /static/images/<nom> pour dev local | https://... pour S3 prod
-- =============================================================

-- Extension pour la recherche approximative (Levenshtein / trigrammes)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================
-- UTILISATEURS
-- =============================================================
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    pseudo        VARCHAR(50)  UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    DEFAULT now()
);

-- =============================================================
-- DICTIONNAIRE — entrées françaises
-- =============================================================
CREATE TABLE dict_entries (
    id          SERIAL PRIMARY KEY,
    mot_fr      VARCHAR(200) NOT NULL,
    synonyme_fr VARCHAR(200),
    description TEXT,
    theme       VARCHAR(100),
    categorie   VARCHAR(100),
    locked_by   INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    locked_at   TIMESTAMP,
    created_by  INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMP    DEFAULT now()
);

-- Index trigram pour la recherche FR et provençal approchée
CREATE INDEX idx_dict_entries_mot_fr_trgm
    ON dict_entries USING gin (mot_fr gin_trgm_ops);

-- =============================================================
-- DICTIONNAIRE — traductions provençales (relation N-N)
-- =============================================================
CREATE TABLE dict_translations (
    id           SERIAL PRIMARY KEY,
    entry_id     INTEGER      NOT NULL REFERENCES dict_entries(id) ON DELETE CASCADE,
    -- graphie : 'mistralienne' | 'classique_ieo' | 'pre_mistralienne' | 'regionale'
    graphie      VARCHAR(50),
    -- source : 'TradEG' | 'TradD' | 'TradA' | 'TradH' | 'TradAv' | 'TradP' | 'TradX'
    source       VARCHAR(20),
    traduction   VARCHAR(500) NOT NULL,
    region       VARCHAR(50),
    locked_by    INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    locked_at    TIMESTAMP,
    created_by   INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMP    DEFAULT now()
);

-- Index trigram pour la recherche provençal → français (toutes graphies)
CREATE INDEX idx_dict_translations_trgm
    ON dict_translations USING gin (traduction gin_trgm_ops);

-- =============================================================
-- AGENDA CULTUREL
-- =============================================================
CREATE TABLE agenda_events (
    id           SERIAL PRIMARY KEY,
    titre        VARCHAR(200) NOT NULL,
    date_debut   DATE         NOT NULL,
    date_fin     DATE         NOT NULL,
    lieu         VARCHAR(200),
    description  VARCHAR(1000),
    lien_externe VARCHAR(500),
    locked_by    INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    locked_at    TIMESTAMP,
    created_by   INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMP    DEFAULT now(),
    CONSTRAINT chk_dates CHECK (date_fin >= date_debut)
);

-- =============================================================
-- BIBLIOTHÈQUE — Histoires & Légendes
-- =============================================================
CREATE TABLE library_entries (
    id                 SERIAL PRIMARY KEY,
    titre              VARCHAR(200) NOT NULL,
    -- 'Histoire' | 'Légende'
    typologie          VARCHAR(20)  CHECK (typologie IN ('Histoire', 'Légende')),
    periode            VARCHAR(200),   -- texte libre, autocomplétion sur valeurs existantes
    description_courte VARCHAR(200),
    description_longue TEXT,           -- Markdown
    source_url         VARCHAR(500),
    -- Référence image : chemin local /static/images/xxx.jpg  OU  URL complète https://...
    image_ref          VARCHAR(500),
    lang               CHAR(2)      DEFAULT 'fr',
    traduction_id      INTEGER      REFERENCES library_entries(id) ON DELETE SET NULL,
    locked_by          INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    locked_at          TIMESTAMP,
    created_by         INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    created_at         TIMESTAMP    DEFAULT now()
);

-- =============================================================
-- ARTICLES CULTURELS
-- Catégories (liste fermée — 20 valeurs, voir §3.5 CDC)
-- =============================================================
CREATE TABLE articles (
    id               SERIAL PRIMARY KEY,
    titre            VARCHAR(200) NOT NULL,
    description      VARCHAR(300),
    -- Référence image : chemin local /static/images/xxx.jpg  OU  URL complète https://...
    image_ref        VARCHAR(500),
    source_url       VARCHAR(500),
    date_publication DATE         NOT NULL,
    auteur           VARCHAR(100),
    categorie        VARCHAR(100) CHECK (categorie IN (
        'Langue & Culture',
        'Littérature',
        'Poésie',
        'Histoire & Mémoire',
        'Traditions & Fêtes',
        'Musique',
        'Danse',
        'Gastronomie',
        'Artisanat',
        'Patrimoine bâti',
        'Environnement',
        'Personnalités',
        'Associations',
        'Enseignement',
        'Économie locale',
        'Numismatique & Archives',
        'Immigration & Diaspora',
        'Jeunesse',
        'Régionalisme & Politique linguistique',
        'Divers'
    )),
    locked_by        INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    locked_at        TIMESTAMP,
    created_by       INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMP    DEFAULT now()
);

-- =============================================================
-- DICTONS, EXPRESSIONS, PROVERBES & MÉMOIRES VIVANTES
-- =============================================================
CREATE TABLE sayings (
    id                 SERIAL PRIMARY KEY,
    terme_provencal    TEXT         NOT NULL,
    localite_origine   VARCHAR(200) NOT NULL,
    traduction_sens_fr TEXT         NOT NULL,
    -- 'Dicton' | 'Expression' | 'Proverbe' | 'Mémoire vivante'
    type               VARCHAR(30)  CHECK (type IN ('Dicton', 'Expression', 'Proverbe', 'Mémoire vivante')),
    contexte           TEXT,
    source             VARCHAR(300),
    locked_by          INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    locked_at          TIMESTAMP,
    created_by         INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    created_at         TIMESTAMP    DEFAULT now()
);

-- Index trigram pour la recherche dans les termes provençaux
CREATE INDEX idx_sayings_terme_trgm
    ON sayings USING gin (terme_provencal gin_trgm_ops);

-- =============================================================
-- ROLLBACK — journal des dernières actions (1 entrée par objet)
-- =============================================================
CREATE TABLE edit_log (
    id          SERIAL PRIMARY KEY,
    table_name  VARCHAR(50)  NOT NULL,
    row_id      INTEGER      NOT NULL,
    action      VARCHAR(10)  NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data    JSONB,
    new_data    JSONB,
    done_by     INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    done_at     TIMESTAMP    DEFAULT now()
);

-- Index pour retrouver rapidement le dernier état d'un objet
CREATE INDEX idx_edit_log_table_row ON edit_log (table_name, row_id, done_at DESC);

-- =============================================================
-- VERROU AUTOMATIQUE — libération après 30 min (via cron ou trigger)
-- Convention : locked_at + 30min > now()  →  verrou actif
--             locked_at + 30min ≤ now()  →  verrou expiré, ignoré
-- =============================================================
