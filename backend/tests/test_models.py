import app.models  # noqa: F401 — déclenche l'enregistrement dans Base.metadata
from app.core.database import Base
from app.models import (
    AgendaEvent,
    Article,
    DictEntry,
    DictTranslation,
    EditLog,
    LibraryEntry,
    Saying,
    User,
)

EXPECTED_TABLES = {
    "users",
    "dict_entries",
    "dict_translations",
    "agenda_events",
    "library_entries",
    "articles",
    "sayings",
    "edit_log",
}


def test_all_models_importable():
    assert User is not None
    assert DictEntry is not None
    assert DictTranslation is not None
    assert AgendaEvent is not None
    assert LibraryEntry is not None
    assert Article is not None
    assert Saying is not None
    assert EditLog is not None


def test_base_metadata_contains_all_tables():
    assert set(Base.metadata.tables.keys()) == EXPECTED_TABLES


def test_all_models_have_tablename():
    models = [User, DictEntry, DictTranslation, AgendaEvent, LibraryEntry, Article, Saying, EditLog]
    for model in models:
        assert hasattr(model, "__tablename__"), f"{model} missing __tablename__"
