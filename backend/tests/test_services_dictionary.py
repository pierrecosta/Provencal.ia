import pytest
from sqlalchemy import delete

from app.core.database import async_session_maker, engine
from app.models.dict_entry import DictEntry
from app.models.dict_translation import DictTranslation
from app.services.dictionary import (
    import_dictionary,
    list_dictionary,
    search_prov_to_fr,
)

_HEADER = "Thème;Catégorie;Mot français;Synonyme français;Description;Traduction;TradEG;TradD;TradA;TradH;TradAv;TradP;TradX"
_VALID_ROW = "Nature;Plantes;Ail;;DescAil;Aiet;;;;;;;Aiet Féro"


def _make_csv(*rows: str) -> bytes:
    return ("\n".join([_HEADER] + list(rows))).encode("utf-8")


@pytest.fixture(autouse=True)
async def clean_db():
    await engine.dispose()
    async with async_session_maker() as session:
        await session.execute(delete(DictTranslation))
        await session.execute(delete(DictEntry))
        await session.commit()
    yield
    await engine.dispose()


async def _seed_entry(session, mot_fr="Ail", traduction="Aiet", graphie="canonique"):
    entry = DictEntry(mot_fr=mot_fr, theme="Nature", categorie="Plantes")
    session.add(entry)
    await session.flush()
    trans = DictTranslation(
        entry_id=entry.id,
        traduction=traduction,
        graphie=graphie,
        source=None,
    )
    session.add(trans)
    await session.commit()
    return entry


async def test_search_fr_to_prov():
    """Recherche FR → résultats avec traductions."""
    await engine.dispose()
    async with async_session_maker() as session:
        await _seed_entry(session, mot_fr="Ail", traduction="Aiet")

    await engine.dispose()
    async with async_session_maker() as session:
        result = await list_dictionary(session, q="Ail", theme=None, categorie=None, graphie=None, source=None, page=1, per_page=20)
        assert result["total"] >= 1
        assert result["items"][0].mot_fr == "Ail"
        assert len(result["items"][0].translations) >= 1


async def test_search_prov_to_fr():
    """Recherche Prov → résultats inversés."""
    await engine.dispose()
    async with async_session_maker() as session:
        await _seed_entry(session, mot_fr="Ail", traduction="Aiet")

    await engine.dispose()
    async with async_session_maker() as session:
        result = await search_prov_to_fr(session, q="Aiet", page=1, per_page=20)
        assert result["total"] >= 1
        assert result["items"][0].mot_fr == "Ail"


async def test_import_csv_valid():
    """Import valide → entrées créées."""
    csv_data = _make_csv(_VALID_ROW)
    await engine.dispose()
    async with async_session_maker() as session:
        result = await import_dictionary(session, csv_data, "test.csv")
        assert result["imported"] == 1

    await engine.dispose()
    async with async_session_maker() as session:
        from sqlalchemy import select
        entries = (await session.execute(select(DictEntry))).scalars().all()
        assert len(entries) == 1
        assert entries[0].mot_fr == "Ail"


async def test_import_csv_encoding():
    """Fichier latin-1 → auto-détection OK."""
    row = "Nature;Plantes;Érable;;Desc;Aurable;;;;;;;Aurable M"
    csv_data = ("\n".join([_HEADER, row])).encode("latin-1")
    await engine.dispose()
    async with async_session_maker() as session:
        result = await import_dictionary(session, csv_data, "test.csv")
        assert result["imported"] == 1
