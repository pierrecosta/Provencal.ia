import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete

from app.core.database import async_session_maker, engine
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.dict_entry import DictEntry
from app.models.dict_translation import DictTranslation
from app.models.edit_log import EditLog
from app.models.user import User

BASE_URL = "http://test"
PREFIX = "/api/v1/dictionary"

TEST_PSEUDO_A = "dict_user_a"
TEST_PSEUDO_B = "dict_user_b"


@pytest.fixture(autouse=True)
async def clean_dict():
    await engine.dispose()
    async with async_session_maker() as session:
        await session.execute(delete(EditLog).where(EditLog.table_name == "dict_entries"))
        await session.execute(delete(DictTranslation))
        await session.execute(delete(DictEntry))
        await session.execute(
            delete(User).where(User.pseudo.in_([TEST_PSEUDO_A, TEST_PSEUDO_B]))
        )
        await session.commit()
    yield
    async with async_session_maker() as session:
        await session.execute(delete(EditLog).where(EditLog.table_name == "dict_entries"))
        await session.execute(delete(DictTranslation))
        await session.execute(delete(DictEntry))
        await session.execute(
            delete(User).where(User.pseudo.in_([TEST_PSEUDO_A, TEST_PSEUDO_B]))
        )
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


# ─── Fixtures utilisateurs ───────────────────────────────────────────────────


@pytest.fixture
async def user_a():
    async with async_session_maker() as session:
        user = User(pseudo=TEST_PSEUDO_A, password_hash=hash_password("pass"))
        session.add(user)
        await session.commit()
        await session.refresh(user)
    return user


@pytest.fixture
async def user_b():
    async with async_session_maker() as session:
        user = User(pseudo=TEST_PSEUDO_B, password_hash=hash_password("pass"))
        session.add(user)
        await session.commit()
        await session.refresh(user)
    return user


@pytest.fixture
def auth_headers_a(user_a):
    token = create_access_token({"sub": user_a.pseudo})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_b(user_b):
    token = create_access_token({"sub": user_b.pseudo})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def sample_entry(user_a):
    async with async_session_maker() as session:
        entry = DictEntry(mot_fr="soleil", theme="Nature", categorie="Éléments")
        session.add(entry)
        await session.flush()
        t1 = DictTranslation(
            entry_id=entry.id,
            graphie="mistralienne",
            source="TradEG",
            traduction="soulèu",
        )
        session.add(t1)
        await session.commit()
        await session.refresh(entry)
    return entry


# ─── GET /dictionary/{id} ────────────────────────────────────────────────────


async def test_get_entry_detail(sample_entry):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.get(f"{PREFIX}/{sample_entry.id}")
    assert r.status_code == 200
    data = r.json()
    assert data["mot_fr"] == "soleil"
    assert data["theme"] == "Nature"
    assert len(data["translations"]) == 1
    assert data["translations"][0]["source"] == "TradEG"
    assert "locked_by" in data
    assert "locked_at" in data


# ─── PUT /dictionary/{id} ────────────────────────────────────────────────────


async def test_update_entry_authenticated(sample_entry, auth_headers_a):
    payload = {
        "mot_fr": "soleil modifié",
        "synonyme_fr": None,
        "description": None,
        "theme": "Nature",
        "categorie": "Éléments",
        "translations": [{"source": "TradEG", "traduction": "soulèu modifié", "graphie": "mistralienne", "region": None}],
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.put(f"{PREFIX}/{sample_entry.id}", json=payload, headers=auth_headers_a)
    assert r.status_code == 200
    data = r.json()
    assert data["mot_fr"] == "soleil modifié"
    assert data["translations"][0]["traduction"] == "soulèu modifié"


async def test_update_entry_unauthenticated(sample_entry):
    payload = {
        "mot_fr": "test",
        "theme": "Nature",
        "categorie": "Éléments",
        "translations": [{"source": "TradEG", "traduction": "test", "graphie": None, "region": None}],
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.put(f"{PREFIX}/{sample_entry.id}", json=payload)
    assert r.status_code == 401


async def test_update_entry_locked_by_other(sample_entry, user_a, user_b, auth_headers_a, auth_headers_b):
    # user_b acquiert le verrou
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r_lock = await c.post(f"{PREFIX}/{sample_entry.id}/lock", headers=auth_headers_b)
    assert r_lock.status_code == 200

    # user_a tente de modifier → 423
    payload = {
        "mot_fr": "tentative",
        "theme": "Nature",
        "categorie": "Éléments",
        "translations": [{"source": "TradEG", "traduction": "test", "graphie": None, "region": None}],
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.put(f"{PREFIX}/{sample_entry.id}", json=payload, headers=auth_headers_a)
    assert r.status_code == 423


# ─── DELETE /dictionary/{id} ─────────────────────────────────────────────────


async def test_delete_entry_authenticated(sample_entry, auth_headers_a):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.delete(f"{PREFIX}/{sample_entry.id}", headers=auth_headers_a)
    assert r.status_code == 204

    # Vérifier que l'entrée est supprimée
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r2 = await c.get(f"{PREFIX}/{sample_entry.id}")
    assert r2.status_code == 404


async def test_delete_entry_unauthenticated(sample_entry):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.delete(f"{PREFIX}/{sample_entry.id}")
    assert r.status_code == 401


# ─── POST/DELETE /dictionary/{id}/lock ───────────────────────────────────────


async def test_lock_entry(sample_entry, user_a, auth_headers_a):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        r = await c.post(f"{PREFIX}/{sample_entry.id}/lock", headers=auth_headers_a)
    assert r.status_code == 200

    # Vérifier le verrou en base
    async with async_session_maker() as session:
        from sqlalchemy import select
        result = await session.execute(
            select(DictEntry).where(DictEntry.id == sample_entry.id)
        )
        entry = result.scalar_one()
    assert entry.locked_by == user_a.id
    assert entry.locked_at is not None


async def test_unlock_entry(sample_entry, user_a, auth_headers_a):
    # Acquérir le verrou d'abord
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        await c.post(f"{PREFIX}/{sample_entry.id}/lock", headers=auth_headers_a)
        r = await c.delete(f"{PREFIX}/{sample_entry.id}/lock", headers=auth_headers_a)
    assert r.status_code == 200

    # Vérifier que le verrou est libéré en base
    async with async_session_maker() as session:
        from sqlalchemy import select
        result = await session.execute(
            select(DictEntry).where(DictEntry.id == sample_entry.id)
        )
        entry = result.scalar_one()
    assert entry.locked_by is None
    assert entry.locked_at is None
