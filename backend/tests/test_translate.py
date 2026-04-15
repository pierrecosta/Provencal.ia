import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete
from sqlalchemy.orm import selectinload

from app.core.database import async_session_maker, engine
from app.main import app
from app.models.dict_entry import DictEntry
from app.models.dict_translation import DictTranslation

BASE_URL = "http://test"
PREFIX = "/api/v1/translate"


@pytest.fixture(autouse=True)
async def clean_translate():
    await engine.dispose()
    async with async_session_maker() as session:
        await session.execute(delete(DictTranslation))
        await session.execute(delete(DictEntry))
        await session.commit()
    yield
    async with async_session_maker() as session:
        await session.execute(delete(DictTranslation))
        await session.execute(delete(DictEntry))
        await session.commit()
    await engine.dispose()


@pytest.fixture
async def maison_entry():
    """Crée une entrée 'maison' → 'maisoun' (canonique)."""
    async with async_session_maker() as session:
        entry = DictEntry(mot_fr="maison")
        session.add(entry)
        await session.flush()
        trans = DictTranslation(entry_id=entry.id, traduction="maisoun", graphie="canonique")
        session.add(trans)
        await session.commit()
        await session.refresh(entry)
    return entry


@pytest.fixture
async def belle_entry():
    """Crée une entrée 'belle' → 'bello' (non-canonique)."""
    async with async_session_maker() as session:
        entry = DictEntry(mot_fr="belle")
        session.add(entry)
        await session.flush()
        trans = DictTranslation(
            entry_id=entry.id, traduction="bello", graphie="mistralienne", source="TradX"
        )
        session.add(trans)
        await session.commit()
    return entry


# ── Tests ────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_translate_empty():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.post(PREFIX, json={"text": ""})
    assert resp.status_code == 200
    data = resp.json()
    assert data["translated"] == ""
    assert data["unknown_words"] == []


@pytest.mark.asyncio
async def test_translate_single_word(maison_entry):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.post(PREFIX, json={"text": "maison"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["translated"] == "maisoun"
    assert data["unknown_words"] == []


@pytest.mark.asyncio
async def test_translate_unknown_word():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.post(PREFIX, json={"text": "xylophone"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["translated"] == "xylophone"
    assert "xylophone" in data["unknown_words"]


@pytest.mark.asyncio
async def test_translate_punctuation(maison_entry):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.post(PREFIX, json={"text": "la maison, ici."})
    assert resp.status_code == 200
    data = resp.json()
    # Ponctuation conservée
    assert "maisoun" in data["translated"]
    assert "," in data["translated"]
    assert "." in data["translated"]


@pytest.mark.asyncio
async def test_translate_mixed(maison_entry):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.post(PREFIX, json={"text": "la maison et le xylophone"})
    assert resp.status_code == 200
    data = resp.json()
    assert "maisoun" in data["translated"]
    assert "xylophone" in data["translated"]
    assert "xylophone" in data["unknown_words"]


@pytest.mark.asyncio
async def test_translate_case_insensitive(maison_entry):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.post(PREFIX, json={"text": "Maison"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["translated"] == "maisoun"
    assert data["unknown_words"] == []
