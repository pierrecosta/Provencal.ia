import pytest
from sqlalchemy import delete

from app.core.database import async_session_maker, engine
from app.models.dict_entry import DictEntry
from app.models.dict_translation import DictTranslation
from app.services.translate import translate_text


@pytest.fixture(autouse=True)
async def clean_db():
    await engine.dispose()
    async with async_session_maker() as session:
        await session.execute(delete(DictTranslation))
        await session.execute(delete(DictEntry))
        await session.commit()
    yield
    await engine.dispose()


async def _seed_words(session):
    """Seed 'bonjour' → 'adieu' et 'soleil' → 'sòu'."""
    e1 = DictEntry(mot_fr="bonjour", theme="Salutations", categorie=None)
    session.add(e1)
    await session.flush()
    session.add(
        DictTranslation(entry_id=e1.id, traduction="adieu", graphie="canonique")
    )

    e2 = DictEntry(mot_fr="soleil", theme="Nature", categorie=None)
    session.add(e2)
    await session.flush()
    session.add(
        DictTranslation(entry_id=e2.id, traduction="sòu", graphie="canonique")
    )

    await session.commit()


async def test_translate_known_words():
    """Mots connus → traductions retournées."""
    await engine.dispose()
    async with async_session_maker() as session:
        await _seed_words(session)

    await engine.dispose()
    async with async_session_maker() as session:
        result = await translate_text(session, "bonjour soleil")
        assert result["translated"] == "adieu sòu"
        assert result["unknown_words"] == []


async def test_translate_unknown_word():
    """Mot inconnu → marqué comme non trouvé."""
    await engine.dispose()
    async with async_session_maker() as session:
        await _seed_words(session)

    await engine.dispose()
    async with async_session_maker() as session:
        result = await translate_text(session, "bonjour monde")
        assert "adieu" in result["translated"]
        assert "monde" in result["unknown_words"]
