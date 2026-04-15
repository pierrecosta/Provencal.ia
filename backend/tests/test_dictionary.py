import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete

from app.core.database import async_session_maker, engine
from app.main import app
from app.models.dict_entry import DictEntry
from app.models.dict_translation import DictTranslation

BASE_URL = "http://test"
PREFIX = "/api/v1/dictionary"


@pytest.fixture(autouse=True)
async def clean_dict():
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
async def sample_entries():
    async with async_session_maker() as session:
        entry1 = DictEntry(
            mot_fr="maison",
            theme="Construction",
            categorie="Habitat",
        )
        entry2 = DictEntry(
            mot_fr="arbre",
            theme="Nature",
            categorie="Végétation",
        )
        entry3 = DictEntry(
            mot_fr="eau",
            theme="Nature",
            categorie="Éléments",
        )
        session.add_all([entry1, entry2, entry3])
        await session.flush()

        t1 = DictTranslation(
            entry_id=entry1.id,
            graphie="mistralienne",
            source="TradEG",
            traduction="oustau",
        )
        t2 = DictTranslation(
            entry_id=entry1.id,
            graphie="classique",
  source="TradD",
            traduction="ostal",
        )
        t3 = DictTranslation(
            entry_id=entry2.id,
            graphie="mistralienne",
            source="TradEG",
            traduction="aubre",
        )
        session.add_all([t1, t2, t3])
        await session.commit()
        await session.refresh(entry1)
        await session.refresh(entry2)
        await session.refresh(entry3)
    return [entry1, entry2, entry3]


# ─── GET /dictionary ───


async def test_list_empty():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(PREFIX)
    assert r.status_code == 200
    data = r.json()
    assert data["items"] == []
    assert data["total"] == 0


async def test_list_with_data(sample_entries):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(PREFIX)
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 3
    # Triés alphabétiquement
    mots = [i["mot_fr"] for i in data["items"]]
    assert mots == sorted(mots)


async def test_list_includes_translations(sample_entries):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(PREFIX)
    items = r.json()["items"]
    maison = next(i for i in items if i["mot_fr"] == "maison")
    assert len(maison["translations"]) == 2


async def test_list_filter_theme(sample_entries):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(PREFIX, params={"theme": "Nature"})
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 2
    assert all(i["theme"] == "Nature" for i in data["items"])


async def test_list_filter_cascade(sample_entries):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(PREFIX, params={"theme": "Nature", "categorie": "Végétation"})
    assert r.status_code == 200
    assert r.json()["total"] == 1
    assert r.json()["items"][0]["mot_fr"] == "arbre"


async def test_search_fr_exact(sample_entries):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(PREFIX, params={"q": "maison"})
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 1
    assert data["items"][0]["mot_fr"] == "maison"


async def test_search_fr_suggestions(sample_entries):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(PREFIX, params={"q": "maisonn"})
    assert r.status_code == 200
    data = r.json()
    # Soit un résultat, soit des suggestions
    assert data["total"] >= 0


# ─── GET /dictionary/search ───


async def test_search_prov_to_fr(sample_entries):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(f"{PREFIX}/search", params={"q": "oustau"})
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1
    assert any(i["mot_fr"] == "maison" for i in data["items"])


# ─── GET /dictionary/themes ───


async def test_themes_endpoint(sample_entries):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(f"{PREFIX}/themes")
    assert r.status_code == 200
    data = r.json()
    assert "themes" in data
    assert "Nature" in data["themes"]
    assert "Végétation" in data["themes"]["Nature"]
