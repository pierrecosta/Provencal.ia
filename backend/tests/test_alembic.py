import configparser
from pathlib import Path

BACKEND_DIR = Path(__file__).parent.parent


def test_alembic_ini_exists_and_parsable():
    ini_path = BACKEND_DIR / "alembic.ini"
    assert ini_path.exists(), "alembic.ini n'existe pas"
    config = configparser.ConfigParser()
    config.read(ini_path)
    assert "alembic" in config.sections(), "Section [alembic] absente de alembic.ini"


def test_alembic_versions_directory_has_migration():
    versions_dir = BACKEND_DIR / "alembic" / "versions"
    assert versions_dir.is_dir(), "Le répertoire alembic/versions/ n'existe pas"
    migrations = list(versions_dir.glob("*.py"))
    assert len(migrations) >= 1, "Aucun fichier de migration .py trouvé dans alembic/versions/"
