import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete

from app.core.database import async_session_maker, engine
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.edit_log import EditLog
from app.models.library_entry import LibraryEntry
from app.models.user import User

BASE_URL = "http://test"
PREFIX = "/api/v1/library"

TEST_PSEUDO = "library_user_a"


@pytest.fixture(autouse=True)
async def clean_library():
    await engine.dispose()
    async with async_session_maker() as session:
        await session.execute(
            delete(EditLog).where(EditLog.table_name == "library_entries")
        )
        await session.execute(delete(LibraryEntry))
        await session.execute(delete(User).where(User.pseudo == TEST_PSEUDO))
        await session.commit()
    yield
    async with async_session_maker() as session:
        await session.execute(
            delete(EditLog).where(EditLog.table_name == "library_entries")
        )
        await session.execute(delete(LibraryEntry))
        await session.execute(delete(User).where(User.pseudo == TEST_PSEUDO))
        await session.commit()
    await engine.dispose()


@pytest.fixture
async def user_a():
    async with async_session_maker() as session:
        user = User(pseudo=TEST_PSEUDO, password_hash=hash_password("pass"))
        session.add(user)
        await session.commit()
        await session.refresh(user)
    return user


@pytest.fixture
def auth_headers(user_a):
    token = create_access_token({"sub": user_a.pseudo})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def two_entries(user_a):
    async with async_session_maker() as session:
        items = [
            LibraryEntry(
                titre="Gyptis et Protis",
                typologie="Histoire",
                periode="Antiquité (avant 500 ap. J.-C.)",
                lang="fr",
                created_by=user_a.id,
            ),
            LibraryEntry(
                titre="La Tarasque",
                typologie="Légende",
                periode="Moyen Âge (500–1500)",
                lang="fr",
                created_by=user_a.id,
            ),
        ]
        session.add_all(items)
        await session.commit()
        for item in items:
            await session.refresh(item)
    return items


# ── GET /library ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_library_empty():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.get(PREFIX)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_list_library_with_items(two_entries):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.get(PREFIX)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2


@pytest.mark.asyncio
async def test_list_library_filter_type(two_entries):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.get(PREFIX, params={"type": "Histoire"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["titre"] == "Gyptis et Protis"


# ── GET /library/periodes ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_periodes(two_entries):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.get(f"{PREFIX}/periodes")
    assert resp.status_code == 200
    periodes = resp.json()
    assert isinstance(periodes, list)
    assert len(periodes) == 2


# ── GET /library/{id} ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_entry_detail(two_entries):
    entry_id = two_entries[0].id
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.get(f"{PREFIX}/{entry_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == entry_id
    assert data["has_translation"] is False
    assert data["translation_lang"] is None


@pytest.mark.asyncio
async def test_get_entry_not_found():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.get(f"{PREFIX}/9999")
    assert resp.status_code == 404


# ── POST /library ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_entry(user_a, auth_headers):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.post(
            PREFIX,
            json={
                "titre": "Lou Drac",
                "typologie": "Légende",
                "periode": "Indéterminé / Mythologique",
                "lang": "fr",
            },
            headers=auth_headers,
        )
    assert resp.status_code == 201
    data = resp.json()
    assert data["titre"] == "Lou Drac"
    assert data["has_translation"] is False


@pytest.mark.asyncio
async def test_create_entry_requires_auth():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.post(PREFIX, json={"titre": "Anon"})
    assert resp.status_code == 401


# ── Bidirectional traduction_id ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_entry_with_translation_link(user_a, auth_headers, two_entries):
    entry_fr = two_entries[0]
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.post(
            PREFIX,
            json={
                "titre": "Gyptis et Protis (prov)",
                "langue": "oc",
                "lang": "oc",
                "traduction_id": entry_fr.id,
            },
            headers=auth_headers,
        )
    assert resp.status_code == 201
    new_id = resp.json()["id"]

    # L'entrée originale doit maintenant pointer vers la nouvelle
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp2 = await c.get(f"{PREFIX}/{entry_fr.id}")
    assert resp2.json()["traduction_id"] == new_id


# ── PUT /library/{id} ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_entry(user_a, auth_headers, two_entries):
    entry_id = two_entries[0].id
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.put(
            f"{PREFIX}/{entry_id}",
            json={"periode": "Époque Moderne (1500–1800)"},
            headers=auth_headers,
        )
    assert resp.status_code == 200
    assert resp.json()["periode"] == "Époque Moderne (1500–1800)"


# ── DELETE /library/{id} ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_entry(user_a, auth_headers, two_entries):
    entry_id = two_entries[0].id
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp = await c.delete(f"{PREFIX}/{entry_id}", headers=auth_headers)
    assert resp.status_code == 200
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as c:
        resp2 = await c.get(f"{PREFIX}/{entry_id}")
    assert resp2.status_code == 404
